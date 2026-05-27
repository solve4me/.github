# Catálogo de Workflows Reutilizáveis

Este diretório contém os pipelines e automações padronizadas para os projetos da nossa organização. Ao invés de recriar rotinas de CI/CD em cada repositório, utilize os workflows abaixo.

---

## 📋 Workflows Disponíveis

| Workflow | Descrição | Arquivo |
|----------|-----------|---------|
| **Time Tracking** | Sincronização e cálculo absoluto de horas baseado em *Issue Types* e integrado ao GitHub Projects v2 | `time-tracking.yml` |

---

### Time Tracking

Sistema de consolidação de horas automatizado para o GitHub Projects v2. Ele foi projetado sob o princípio da **idempotência**: toda vez que um registro é criado, alterado ou removido, o script varre o histórico completo de comentários da issue, calcula o estado absoluto atual e atualiza o board sem risco de duplicidade.

#### Arquitetura e Fluxo de Dados

O workflow é disparado nativamente por eventos de comentários (`created, edited, deleted`) ou ciclo de vida da issue (`closed, reopened`). 

Em vez de acumular valores incrementalmente (o que gerava bugs em edições), o script funciona como um consolidador de estado:
1. O gatilho é acionado no repositório de trabalho.
2. O script consulta a API GraphQL para validar se a issue pertence ao tipo nativo **Task**. Se não for, a execução é abortada imediatamente para poupar recursos.
3. O script faz uma varredura (API REST) e coleta todos os comentários ativos na issue.
4. O parser processa todos os comandos `/log` encontrados, calcula a soma matemática exata e substitui o valor do campo no GitHub Project pelo novo total consolidado.

---

#### 🛠️ Configuração (Passo a Passo)

**1. Estrutura de Arquivos no Repositório Central (`solve4me/.github`)**
O script em Node.js (com logs em inglês) e o workflow reutilizável devem estar organizados da seguinte forma dentro do seu repositório centralizador:

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

**3. Permissões de Workflow**
Para organizações (como a Solve4me) e repositórios privados, é necessário elevar o privilégio do token de execução padrão.
* Acesse `Settings → Actions → General → Workflow permissions`.
* Selecione **Read and write permissions**.
* Salve as alterações.

---

#### 🚀 Guia de Uso

Os desenvolvedores interagem diretamente através dos comentários das Tasks usando a sintaxe clássica do comando /log:

```text
/log 2h
/log 1h30m
/log 30m
/log 2.5h
/log 1h 30m
```
---

#### ⚙️ O Poder do Estado Absoluto (Exemplos Práticos)

* **Criar Registro:** O desenvolvedor digita /log 2h. O script roda, soma e define o campo do Project como 2.
* **Corrigir Erros (Edição):** Se o desenvolvedor digitou 5h por engano, basta ele editar o próprio comentário para /log 2h. O fluxo roda novamente, lê o comentário atualizado, ignora o valor antigo de 5h e redefine o campo do Project diretamente para 2.
* **Remover Registros (Exclusão):** Se um comentário com /log 1h for deletado, a automação recalcula todos os comentários restantes e diminui 1 hora do painel de forma totalmente automática.
* **Silencioso e Limpo:** O script não faz novos comentários na issue confirmando o lançamento. A atualização ocorre diretamente no card do board, evitando poluição visual e notificações desnecessárias para a equipe.

---

## Contribuições

<table> 
  <tr> 
    <td align="center"> <a href="https://github.com/felipe-xavier-corp"> <img src="https://avatars.githubusercontent.com/u/176419645?v=4" width="100px;" alt="Felipe Xavier" style="border-radius: 50%"/> <br /> <sub><b>Felipe Xavier</b></sub> </a> 
    </td> 
  </tr> 
</table>
