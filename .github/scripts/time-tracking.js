const token = process.env.GITHUB_TOKEN;
const projectNum = Number.parseInt(process.env.PROJECT_NUMBER, 10);
const hoursField = process.env.HOURS_FIELD || "Horas Lançadas";
const issueNumber = Number.parseInt(process.env.ISSUE_NUMBER, 10);
const owner = process.env.REPO_OWNER;
const repo = process.env.REPO_NAME;

function parseHours(comment) {
	if (!comment) return null;
	const match = comment.match(
		/^\/log\s+(?:(\d+(?:\.\d+)?)\s*h)?\s*(?:(\d+)\s*m)?/im,
	);
	if (!match || (!match[1] && !match[2])) return null;
	const h = Number.parseFloat(match[1] || 0);
	const m = Number.parseInt(match[2] || 0, 10);
	const total = h + m / 60;
	return total > 0 ? total : null;
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
	if (json.errors) throw new Error(json.errors[0].message);
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
	if (!res.ok) return null;
	return res.json();
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
                    projectItems(first: 10) {
                        nodes {
                            id
                            project { id number }
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

async function main() {
	console.log(`Calculating total logged hours for Issue #${issueNumber}...`);

	// 1. Fetch all comments from the issue
	const comments = await restGet(
		`/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=100`,
	);
	if (!comments) throw new Error("Could not fetch issue comments.");

	// 2. Sum up hours from all comments that match the /log command
	let totalHours = 0;
	for (const comment of comments) {
		const hours = parseHours(comment.body);
		if (hours) {
			totalHours += hours;
		}
	}

	totalHours = round2(totalHours);
	console.log(`Total calculated: ${totalHours}h`);

	// 3. Fetch project metadata and item alignment
	const taskIssue = await getIssueData(issueNumber);
	const taskItem = taskIssue.projectItems?.nodes?.find(
		(i) => i.project.number === projectNum,
	);

	if (!taskItem) {
		console.log(
			`Issue #${issueNumber} is not linked to project #${projectNum}. Skipping execution.`,
		);
		return;
	}

	const projectId = taskItem.project.id;
	const fields = await getProjectFields(projectId);
	const hField = fields.find(
		(f) => f?.name?.toLowerCase() === hoursField?.toLowerCase(),
	);

	if (!hField) {
		console.error(
			`Numeric field "${hoursField}" was not found in the target GitHub Project.`,
		);
		return;
	}

	// 4. Update the project item with the absolute accumulated hours
	await updateNumberField(projectId, taskItem.id, hField.id, totalHours);
	console.log(
		`Project updated successfully! New absolute value: ${totalHours}h`,
	);
}

main().catch(async (err) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
