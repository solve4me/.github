---
name: "Incident Report"
about: "Use este template para reportar um incidente de alta prioridade que exige pausa imediata no roadmap."
title: "[INCIDENT] "
labels: []
assignees: ""
---

<!-- ⚠️ ATENÇÃO: Este template é exclusivo para INCIDENTES DE ALTA PRIORIDADE. A abertura desta issue irá gerar uma PAUSA NO ROADMAP atual para que a equipe técnica foque na resolução imediata do problema descrito.

Antes de salvar, verifique na barra lateral direita se você preencheu:
- [ ] Projects
- [ ] Type (Definir como `Incident` ou equivalente)
- [ ] Labels (ex: `bug`, `incident`, `p0`)
- [ ] Priority (Obrigatório definir como máxima prioridade, ex: `P0`)
- [ ] Impact
- [ ] Risk Level
-->

## 🚨 Descrição do Incidente e Impacto
<!-- Descreva claramente o que está ocorrendo de errado.
Qual é o impacto imediato no negócio, na operação ou para os clientes finais? -->

- 

## 🔍 Como Identificar/Reproduzir a Falha
<!-- Como o time técnico pode constatar o problema? 
Liste passos para reproduzir a falha, links de dashboards de monitoramento ou queries de banco de dados. -->

1. 
2. 
3. 

## 🖥️ Serviços e Ambiente Afetados
<!-- Onde o incidente está ocorrendo? Preencha os dados aplicáveis. -->

- **Ambiente:** <!-- (Exclusivo Produção) -->
- **Serviços/Aplicações afetados:** 
- **Horário de Início do Incidente:** 

---

## 📎 Evidências (Monitoramento e Logs)
<!-- Insira capturas de tela, links de ferramentas de monitoramento (Datadog, Grafana, Sentry, AWS CloudWatch) ou trechos de logs que evidenciem a falha. -->

```bash
# Cole seu log de erro, alerta ou stack trace aqui
```

## 🩹 Ações de Mitigação (Contorno / Workaround)
<!-- Há alguma ação imediata que reduza o impacto enquanto a causa raiz é investigada e corrigida (ex: executar um Rollback, desligar uma Feature Flag, reiniciar serviço)? -->

- 

## 📞 Status da Comunicação
<!-- Indique se as demais áreas da empresa ou clientes já estão cientes do impacto. -->

- [ ] Áreas de Negócio / Stakeholders notificados
- [ ] Clientes ou Usuários finais informados
- [ ] Status Page atualizada (se aplicável)
