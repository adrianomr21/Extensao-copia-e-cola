Este projeto é uma Extensão do Chrome, indicado pela presença dos arquivos `manifest.json`, `background.js`, `content.js`, `popup.html`, `popup.js` e `offscreen.html`/`offscreen.js`.

**Funcionalidades Atuais:**
- **Automação de Copiar/Colar:** A extensão permite que o usuário cole um bloco de texto na interface do popup, que é então dividido em linhas.
- **Botão "Começar":** Ao clicar, a primeira linha do texto é copiada para a área de transferência.
- **Atalho `Ctrl+V`:** Permite colar o conteúdo atual da área de transferência nativamente no editor. Imediatamente após a colagem, a próxima linha da lista é copiada para a área de transferência.
- **Atalho `Ctrl+Space`:** Aciona a cópia da próxima linha para a área de transferência.
- **Botão "Copiar Próxima":** Copia a próxima linha da lista para a área de transferência.
- **Botão "Copiar Anterior":** Copia a linha anterior da lista para a área de transferência.
- **Remoção de Formatação:** Ao copiar para a área de transferência, a extensão remove letras de alternativas (ex: A), B), C)) e a string "Feedback:".
- **Botão "Resetar":** Limpa o estado da extensão, permitindo iniciar um novo processo.

**Arquivos Chave e suas prováveis funções:**
- `manifest.json`: Define as propriedades, permissões e atalhos de teclado da extensão.
- `background.js`: Lida com a lógica de automação, gerenciamento do estado (linhas e índice atual) e comunicação com `content.js` e `offscreen.js`. Inclui a lógica para remover formatação do texto copiado.
- `content.js`: Interage com o conteúdo das páginas da web, detectando o `Ctrl+V` para acionar a lógica de cópia da próxima linha.
- `popup.html`, `popup.css`, `popup.js`: Definem e controlam a interface do usuário (UI) do pop-up da extensão, incluindo os botões "Começar", "Copiar Próxima", "Copiar Anterior" e "Resetar".
- `offscreen.html`, `offscreen.js`: Usados para operações de cópia para a área de transferência em segundo plano.
- `icons/`: Contém vários tamanhos de ícones para a extensão.