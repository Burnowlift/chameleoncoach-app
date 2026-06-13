# Corrigir e-mail de login do aluno

## Situação encontrada
- A conta de autenticação `1@1.com` ainda existe no sistema e é a conta que o aluno Henrique Eduardo usa para logar (vinculada ao cadastro com e-mail `armmaxx2@gmail.com`).
- A redefinição de senha funcionou, mas o login falha porque ele tenta entrar com `armmaxx2@gmail.com` e o e-mail de login registrado é `1@1.com`.

## O que será feito

1. **Corrigir o e-mail de login do Henrique agora**
   - Atualizar o e-mail da conta de autenticação de `1@1.com` para `armmaxx2@gmail.com`, já confirmado (sem exigir verificação por e-mail).
   - Após isso, ele consegue logar com `armmaxx2@gmail.com` + a nova senha.

2. **Evitar que isso aconteça de novo**
   - Atualizar a função de backend de redefinição/edição para que, sempre que o treinador alterar o e-mail do aluno em "Editar Dados", o e-mail de login seja atualizado junto.
   - Assim o e-mail do cadastro e o e-mail de login nunca ficam dessincronizados.

## Detalhes técnicos
- Criar/ajustar edge function (service role) que chama `auth.admin.updateUserById` com `email` + `email_confirm: true`.
- No `Students.tsx`, ao salvar edição com e-mail alterado, chamar essa função.
- A correção imediata do Henrique será feita chamando essa mesma função (ou via update direto com service role) logo após o deploy.
