# Catálogo de Workflows Reutilizáveis

Este diretório contém os pipelines e automações padronizadas para os projetos da nossa organização. Ao invés de recriar rotinas de CI/CD em cada repositório, utilize os workflows abaixo.

---

## 📋 Workflows Disponíveis

| Workflow | Descrição | Arquivo |
|----------|-----------|---------|
| **Time Tracking** | Sistema de controle de horas integrado ao GitHub Projects v2 | `time-tracking.yml` |

---

### Time Tracking

Sistema de controle de horas integrado ao GitHub Projects v2, projetado para realizar a propagação automática (rollup) de esforço na hierarquia de planejamento ágil: `Épico → História → Task`.

#### Arquitetura e Fluxo de Dados

A action é engatilhada via webhook ao detectar o comando `/log` em comentários de qualquer issue. O workflow processa a entrada, atualiza o campo numérico correspondente no Project e recalcula as horas para os níveis superiores através das relações nativas de sub-issues do GitHub.

**Fluxo de Propagação (Top-down):**
1. **Task #42** (Desenvolvedor comenta `/log 1h30m`)
2. **História #20** (Pai: Horas recalculadas baseadas na soma das tasks)
3. **Épico #5** (Avô: Horas recalculadas baseadas na soma das histórias)

---

#### 🛠️ Configuração (Passo a Passo)

**1. Importação da Estrutura de Arquivos**
Sincronize ou copie os arquivos essenciais para o repositório destino da action:

~~~bash
.github/
  workflows/
    time-tracking.yml
  scripts/
    time-tracking.js
~~~

**2. Configuração do GitHub Project (Projects v2)**
A action exige um campo numérico dedicado no projeto para persistir o estado das horas.
1. Abra o painel do seu GitHub Project.
2. Clique em `+` (adicionar campo) e selecione o tipo **Number**.
3. Nomeie o campo (ex: `Horas Lançadas`).
4. *Nota:* Este mesmo campo é utilizado em todos os níveis estruturais (Épicos, Histórias e Tasks).

**3. Variáveis de Repositório**
No repositório da aplicação, acesse `Settings → Secrets and variables → Actions → Variables` e defina:

| Variável | Valor Exemplo | Descrição |
|---|---|---|
| `TIME_TRACKING_PROJECT_NUMBER` | `1` | Número identificador do GitHub Project (visível na URL). |
| `TIME_TRACKING_HOURS_FIELD` | `Horas Lançadas` | Nome exato (case-sensitive) do campo criado no passo 2. |

**4. Permissões de Workflow**
Para organizações (como a Solve4me) e repositórios privados, é necessário elevar o privilégio do token de execução padrão.
* Acesse `Settings → Actions → General → Workflow permissions`.
* Selecione **Read and write permissions**.
* Salve as alterações.

**5. Topologia das Sub-issues**
A mecânica de rollup depende restritamente do recurso de sub-issues nativas introduzido pelo GitHub:
* **Épico**: Deve conter as histórias vinculadas via funcionalidade de sub-issues.
* **História**: Deve conter as tasks vinculadas via funcionalidade de sub-issues.
* **Task**: Atua como nó folha (leaf node - não deve possuir sub-issues).

---

#### 🚀 Guia de Uso

Em qualquer issue classificada como task, insira um comentário isolado para registrar o esforço despendido. O parser embutido na action suporta variações de sintaxe:

```text
/log 2h
/log 1h30m
/log 30m
/log 2.5h
/log 1h 30m
```

Imediatamente após o processamento da action, um bot responderá com uma tabela de confirmação consolidando a árvore afetada:

```markdown
⏱️ 1h 30min logged by @you

| Level | Issue           | Accumulated Hours |
|-------|-----------------|-------------------|
| Task  | #42 Implement X | 3h 30min          |
| Story | #20 Feature Y   | 8h 15min          |
| Epic  | #5 Q2 Backend   | 42h               |
```

---

#### ⚙️ Comportamento de Acúmulo e Edge Cases

* **Soma Cumulativa**: Lançamentos sucessivos via `/log` na mesma issue apenas incrementam o saldo; não o sobrescrevem.
* **Recálculo Ascendente**: As horas alocadas na história e no épico não são persistências fixas, mas sim o recálculo dinâmico da soma total de seus respectivos filhos.
* **Warning de Projeto**: Caso o usuário execute um `/log` em uma issue não atrelada ao Project configurado, a action avisará via log/comentário e finalizará sem erros (exit status success) para não travar a esteira.
* **Issues Órfãs**: Se uma task não estiver atrelada a nenhuma história/épico, as horas serão imputadas estritamente a ela.

---

#### ⚠️ Troubleshooting

| Problema Encontrado | Causa Provável | Solução |
|---|---|---|
| **Campo não encontrado** | Desalinhamento nominal entre variável e project. | Verifique se o valor de `TIME_TRACKING_HOURS_FIELD` corresponde exatamente ao nome do campo no Project. |
| **Issue não está no projeto** | A issue alvo não foi indexada ao board principal. | Inclua a issue manualmente no GitHub Project associado. |
| **Rollup não funciona** | Estrutura de dependência configurada de forma errada (ex: trackers antigos, tags ou checkboxes textuais). | Converta a hierarquia para utilizar a funcionalidade oficial de **Sub-issues** do GitHub. |
| **Action falha com 403 (Permission)** | O `GITHUB_TOKEN` está rodando em modo restrito de apenas leitura. | Habilite as permissões de escrita em `Settings → Actions → General`. |

---

## Contribuições

<table> 
  <tr> 
    <td align="center"> <a href="https://github.com/felipe-xavier-corp"> <img src="https://avatars.githubusercontent.com/u/176419645?v=4" width="100px;" alt="Felipe Xavier" style="border-radius: 50%"/> <br /> <sub><b>Felipe Xavier</b></sub> </a> 
    </td> 
  </tr> 
</table>
