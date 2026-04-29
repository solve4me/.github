const token = process.env.GITHUB_TOKEN;
const projectNum = parseInt(process.env.PROJECT_NUMBER, 10);
const hoursField = process.env.HOURS_FIELD || "Horas Lançadas";
const commentBody = (process.env.COMMENT_BODY || "").trim();
const issueNumber = parseInt(process.env.ISSUE_NUMBER, 10);
const owner = process.env.REPO_OWNER;
const repo = process.env.REPO_NAME;
const commenter = process.env.COMMENTER;

function parseHours(comment) {
	const match = comment.match(
		/^\/log\s+(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+)\s*m)?/i,
	);
	if (!match || (!match[1] && !match[2])) return null;
	const h = parseFloat(match[1] || 0);
	const m = parseInt(match[2] || 0, 10);
	const total = h + m / 60;
	return total > 0 ? total : null;
}

function formatHours(h) {
	const hrs = Math.floor(h);
	const mins = Math.round((h - hrs) * 60);
	if (hrs === 0) return `${mins}min`;
	if (mins === 0) return `${hrs}h`;
	return `${hrs}h ${mins}min`;
}

function round2(n) {
	return Math.round(n * 100) / 100;
}

async function graphql(query, variables = {}) {
	const res = await fetch("https://api.github.com/graphql", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ query, variables }),
	});
	const json = await res.json();
	if (json.errors) {
		console.error("GraphQL errors:", JSON.stringify(json.errors, null, 2));
		throw new Error(json.errors[0].message);
	}
	return json.data;
}

async function restGet(path) {
	const res = await fetch(`https://api.github.com${path}`, {
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: "application/vnd.github.v3+json",
			"X-GitHub-Api-Version": "2022-11-28",
		},
	});
	if (!res.ok) {
		console.warn(`GET ${path} → ${res.status}`);
		return null;
	}
	return res.json();
}

async function postComment(num, body) {
	const res = await fetch(
		`https://api.github.com/repos/${owner}/${repo}/issues/${num}/comments`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
				Accept: "application/vnd.github+json",
			},
			body: JSON.stringify({ body }),
		},
	);
	if (!res.ok) console.error("Falha ao postar comentário:", await res.text());
}

async function getIssueData(num) {
	const data = await graphql(
		`
    query($owner: String!, $repo: String!, $number: Int!) {
      repository(owner: $owner, name: $repo) {
        issue(number: $number) {
          id
          number
          title
          trackedInIssues(first: 1) {
            nodes {
              id
              number
              title
              trackedInIssues(first: 1) {
                nodes { id number title }
              }
            }
          }
          projectItems(first: 10) {
            nodes {
              id
              project { id number }
              fieldValues(first: 30) {
                nodes {
                  ... on ProjectV2ItemFieldNumberValue {
                    number
                    field {
                      ... on ProjectV2Field { id name dataType }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `,
		{ owner, repo, number: num },
	);
	return data.repository.issue;
}

async function getProjectFields(projectId) {
	const data = await graphql(
		`
    query($id: ID!) {
      node(id: $id) {
        ... on ProjectV2 {
          fields(first: 30) {
            nodes {
              ... on ProjectV2Field { id name dataType }
            }
          }
        }
      }
    }
  `,
		{ id: projectId },
	);
	return data.node?.fields?.nodes ?? [];
}

async function updateNumberField(projectId, itemId, fieldId, value) {
	await graphql(
		`
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: Float!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId
        itemId: $itemId
        fieldId: $fieldId
        value: { number: $value }
      }) {
        projectV2Item { id }
      }
    }
  `,
		{ projectId, itemId, fieldId, value },
	);
}

async function getSubIssues(num) {
	const data = await restGet(
		`/repos/${owner}/${repo}/issues/${num}/sub_issues`,
	);
	return Array.isArray(data) ? data : [];
}

function extractHours(issue, projectId, fieldName) {
	const item = issue.projectItems?.nodes?.find(
		(i) => i.project.id === projectId,
	);
	if (!item) return 0;
	const fv = item.fieldValues?.nodes?.find(
		(v) => v?.field?.name?.toLowerCase() === fieldName?.toLowerCase(),
	);
	return fv?.number ?? 0;
}

async function rollupToParent(parentNum, projectId, fieldId, fieldName) {
	const subIssues = await getSubIssues(parentNum);
	console.log(
		`Sub-issues of #${parentNum}: [${subIssues.map((s) => `#${s.number}`).join(", ") || "none"}]`,
	);

	let total = 0;
	for (const sub of subIssues) {
		const subData = await getIssueData(sub.number);
		const h = extractHours(subData, projectId, fieldName);
		console.log(`#${sub.number}: ${formatHours(h)}`);
		total += h;
	}
	total = round2(total);

	const parentData = await getIssueData(parentNum);
	const parentItem = parentData.projectItems?.nodes?.find(
		(i) => i.project.number === projectNum,
	);

	if (!parentItem) {
		console.warn(
			`Issue #${parentNum} is not in project #${projectNum}, skipping rollup.`,
		);
		return total;
	}

	await updateNumberField(projectId, parentItem.id, fieldId, total);
	console.log(`Rollup #${parentNum} → ${formatHours(total)}`);
	return total;
}

async function main() {
	const hours = parseHours(commentBody);
	if (hours === null) {
		console.log(
			"Invalid format. Use: /log 2h | /log 1h30m | /log 30m | /log 2.5h",
		);
		await postComment(
			issueNumber,
			[
				"**Invalid format.** Use one of the formats below:",
				"",
				"```",
				"/log 2h        → 2 hours",
				"/log 1h30m     → 1h and 30min",
				"/log 30m       → 30 minutes",
				"/log 2.5h      → 2h and 30min",
				"```",
			].join("\n"),
		);
		return;
	}

	console.log(
		`\nIssue #${issueNumber} | @${commenter} wants to log ${formatHours(hours)}`,
	);

	const taskIssue = await getIssueData(issueNumber);

	const taskItem = taskIssue.projectItems?.nodes?.find(
		(i) => i.project.number === projectNum,
	);
	if (!taskItem) {
		await postComment(
			issueNumber,
			[
				`Issue #${issueNumber} is not in project **#${projectNum}**.`,
				"Add it to the project before logging hours.",
			].join("\n"),
		);
		return;
	}

	const projectId = taskItem.project.id;

	const fields = await getProjectFields(projectId);
	const hField = fields.find(
		(f) => f?.name?.toLowerCase() === hoursField?.toLowerCase(),
	);

	if (!hField) {
		await postComment(
			issueNumber,
			[
				`Field **"${hoursField}"** not found in the project.`,
				"",
				"Create a **Number** type field with this name in the GitHub Project.",
				`> Configured via \`TIME_TRACKING_HOURS_FIELD\` (current: \`${hoursField}\`)`,
			].join("\n"),
		);
		return;
	}

	const currentHours = extractHours(taskIssue, projectId, hoursField);
	const newTaskHours = round2(currentHours + hours);

	await updateNumberField(projectId, taskItem.id, hField.id, newTaskHours);
	console.log(
		`\nTask #${issueNumber}: ${formatHours(currentHours)} + ${formatHours(hours)} = ${formatHours(newTaskHours)}`,
	);

	const storyNode = taskIssue.trackedInIssues?.nodes?.[0];
	let storyHours = null;
	let epicHours = null;
	let epicNode = null;

	if (storyNode) {
		console.log(`\nPropagating to story #${storyNode.number}...`);
		storyHours = await rollupToParent(
			storyNode.number,
			projectId,
			hField.id,
			hoursField,
		);

		epicNode = storyNode.trackedInIssues?.nodes?.[0];
		if (epicNode) {
			console.log(`\nPropagating to epic #${epicNode.number}...`);
			epicHours = await rollupToParent(
				epicNode.number,
				projectId,
				hField.id,
				hoursField,
			);
		}
	}

	const lines = [
		`**${formatHours(hours)} logged** by @${commenter}`,
		"",
		"| Level | Issue | Accumulated Hours |",
		"|-------|-------|-------------------|",
		`| Task | #${issueNumber} ${taskIssue.title} | **${formatHours(newTaskHours)}** |`,
	];

	if (storyNode && storyHours !== null) {
		lines.push(
			`| Story | #${storyNode.number} ${storyNode.title} | **${formatHours(storyHours)}** |`,
		);
	}
	if (epicNode && epicHours !== null) {
		lines.push(
			`| Epic | #${epicNode.number} ${epicNode.title} | **${formatHours(epicHours)}** |`,
		);
	}

	await postComment(issueNumber, lines.join("\n"));
	console.log("\nDone!");
}

main().catch(async (err) => {
	console.error("Fatal error:", err);
	await postComment(
		issueNumber,
		`**Error logging hours:**\n\`\`\`\n${err.message}\n\`\`\``,
	);
	process.exit(1);
});
