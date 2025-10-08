let hideTimeout = null; // To store the timeout ID for hiding the div
let removeTimeout = null; // To store the timeout ID for removing the div

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("content.js: Mensagem recebida: ", request.action);
    if (request.action === "copyToClipboard") {
        console.log("content.js: Tentando copiar texto: ", request.text);
        navigator.clipboard.writeText(request.text).then(() => {
            console.log("content.js: Texto copiado com sucesso.");
            sendResponse({ success: true });
        }).catch(err => {
            console.error('Erro ao copiar para a área de transferência (content.js): ', err);
            sendResponse({ success: false, error: err.message });
        });
        return true; // Indicates that the response will be sent asynchronously
    } else if (request.action === "showCopiedText") {
        console.log("content.js: Recebido texto para exibir: ", request.text, "Trigger:", request.trigger);
        displayCopiedText(request.text, request.trigger);
    }
});

function displayCopiedText(text, trigger) {
    let displayDiv = document.getElementById('copiedTextDisplay');
    if (!displayDiv) {
        displayDiv = document.createElement('div');
        displayDiv.id = 'copiedTextDisplay';
        document.body.appendChild(displayDiv);
    }

    // Clear any existing timeouts
    if (hideTimeout) clearTimeout(hideTimeout);
    if (removeTimeout) clearTimeout(removeTimeout);

    displayDiv.textContent = `${trigger}:\n${text}`;
    displayDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        max-width: 600px;
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 10px 15px;
        border-radius: 5px;
        font-size: 16px;
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.5s ease-in-out;
        white-space: pre-wrap;
    `;

    // Show the div immediately
    displayDiv.style.opacity = 1;

    // Hide and remove after a few seconds
    hideTimeout = setTimeout(() => {
        displayDiv.style.opacity = 0;
        removeTimeout = setTimeout(() => {
            if (displayDiv.parentNode) {
                displayDiv.parentNode.removeChild(displayDiv);
            }
        }, 500); // Wait for fade out transition
    }, 2000); // Display for 3 seconds
}

document.addEventListener('keydown', (event) => {
    // Check for Ctrl+V (Windows/Linux) or Cmd+V (Mac)
    if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        console.log("content.js: Ctrl+V detectado. Enviando mensagem para background.js...");
        chrome.runtime.sendMessage({ action: "triggerNextCopy" });
    }
});