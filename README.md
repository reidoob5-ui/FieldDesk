# FieldDesk

**Gestão inteligente de serviços técnicos e equipas externas.**

FieldDesk é uma aplicação web responsiva e instalável (PWA) para empresas de manutenção, assistência técnica e operações no terreno.

## O que existe no repositório

### Demonstração frontend
- Dashboard operacional e indicadores demonstrativos.
- Ordens de trabalho: criação, pesquisa, filtros e atualização de estado no navegador.
- Gestão demonstrativa de técnicos, agenda, materiais e clientes.
- Relatórios e exportação CSV.
- Interface em português, inglês e espanhol.
- Moedas configuráveis (USD, EUR, AOA).
- PWA com manifesto e service worker.
- Página de autenticação e onboarding Supabase em `login.html`.

### Fundação backend Supabase
- Migrações PostgreSQL para organizações, memberships, clientes, técnicos, ordens, histórico, materiais, anexos e aprovações.
- RLS inicial para isolamento por organização.
- Função `create_organization` que cria a organização e atribui o primeiro proprietário.
- Trigger que cria o perfil após registo Auth.
- Políticas reforçadas para restringir atualizações de ordens aos técnicos atribuídos e staff autorizado.

## Executar localmente

```bash
python -m http.server 4173
```

Abre http://localhost:4173.

## Configurar Supabase

Segue o guia [supabase/SETUP.md](./supabase/SETUP.md).

1. Cria um projeto Supabase.
2. Copia `supabase/config.example.js` para `supabase/config.js` e coloca o Project URL e a chave pública publishable/anon.
3. Liga o projeto com Supabase CLI e executa `supabase db push`.
4. Abre `/login.html`, cria uma conta e um workspace.

Nunca coloques uma chave `service_role` no frontend. O ficheiro `supabase/config.js` está no `.gitignore`.

## Estado real do produto

**Ainda é uma demonstração frontend com uma fundação inicial de backend.** A autenticação e a criação/seleção de workspace estão preparadas para Supabase depois de configurar as credenciais e aplicar as migrações. O dashboard principal continua a usar dados locais de demonstração e ainda não sincroniza ordens, técnicos, clientes ou materiais com PostgreSQL.

Antes de produção, ainda é necessário:
- Ligar os módulos do dashboard às tabelas reais e remover dados fictícios.
- Implementar convites e gestão de membros/permissões.
- Configurar políticas de Storage para fotografias e documentos.
- Implementar checklists, assinaturas e portal de cliente.
- Implementar GPS com consentimento e políticas de retenção.
- Implementar billing, limites por plano, auditoria e notificações.
- Testes automatizados de RLS, fluxos de autenticação e isolamento entre organizações.
- Backups, monitorização, SMTP e hardening de segurança.

## Planos de lançamento (hipóteses de preço)

| Plano | Preço | Limite |
|---|---:|---:|
| Starter | $19/mês | 3 técnicos |
| Professional | $49/mês | 15 técnicos |
| Business | $99/mês | 50 técnicos |

Os preços são hipóteses iniciais para validação, não preços de mercado comprovados.
