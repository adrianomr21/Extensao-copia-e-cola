let copyTimeout = null; // To store the timeout ID

// Function to create and manage the offscreen document
async function setupOffscreenDocument() {
    if (await chrome.offscreen.hasDocument()) return;
    await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['CLIPBOARD'],
        justification: 'Permite copiar texto para a área de transferência em segundo plano.',
    });
}

// Function to copy text using the offscreen document
async function copyTextUsingOffscreen(textToCopy, triggerName) {
    await setupOffscreenDocument();
    // Remove letras alternativas como A), a), B), b), etc.
    let cleanedText = textToCopy.replace(/^[A-Za-z]\)/gm, '').trim();
    // Remove "Feedback:" apenas se for a primeira palavra da frase (qualquer capitalização)
    cleanedText = cleanedText.replace(/^feedback:/i, '').trim();

    return new Promise((resolve) => {
        const messageListener = (message) => {
            if (message.type === 'copy_success_offscreen') {
                chrome.runtime.onMessage.removeListener(messageListener);
                console.log("background.js: copy_success_offscreen recebido. Chamando showNotification.");
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    if (tabs[0]) {
                        chrome.tabs.sendMessage(tabs[0].id, {action: "showCopiedText", text: textToCopy, trigger: triggerName});
                    }
                });
                resolve(true);
            } else if (message.type === 'copy_fail_offscreen') {
                chrome.runtime.onMessage.removeListener(messageListener);
                console.error('Erro ao copiar via offscreen: ', message.error);
                resolve(false);
            }
        };
        chrome.runtime.onMessage.addListener(messageListener);
        chrome.runtime.sendMessage({ type: 'copy_to_clipboard_offscreen', text: cleanedText });
    });
}

// Function to display a notification
function showNotification(message) {
    try {
        chrome.notifications.create({
            type: "basic",
            iconUrl: "icons/icon48.png", // Use an existing icon
            title: "Texto Copiado",
            message: message,
            priority: 2,
            requireInteraction: true
        }, function(notificationId) {
            if (chrome.runtime.lastError) {
                console.error("background.js: Erro ao criar notificação (callback):", chrome.runtime.lastError.message);
            } else {
                console.log("background.js: Notificação criada com ID:", notificationId);
            }
        });
    } catch (e) {
        console.error("background.js: Erro ao criar notificação:", e);
    }
}

chrome.commands.onCommand.addListener(async (command) => {
    if (command === "copy_next_line") {
        console.log("background.js: Comando copy_next_line (Ctrl+V) recebido.");
        // Clear any existing timeout to prevent multiple copies
        if (copyTimeout) {
            clearTimeout(copyTimeout);
            console.log("background.js: Timeout anterior limpo.");
        }

        // Notify popup about the pending copy (optional, for UI feedback)
        chrome.runtime.sendMessage({ action: "statusUpdate", message: "Aguardando 2 segundos para copiar a próxima linha..." });
        console.log("background.js: Mensagem de status enviada para o popup.");

        console.log("background.js: Tentando copiar a próxima linha imediatamente...");
    chrome.storage.local.get(['lines', 'currentIndex'], async function(result) {
        let lines = result.lines || [];
        let currentIndex = result.currentIndex || 0;
        console.log("background.js: Dados do storage - lines:", lines, "currentIndex:", currentIndex);

        // Increment currentIndex to point to the *next* line to be copied
        currentIndex++;

        if (lines.length > 0 && currentIndex < lines.length) {
            const textToCopy = lines[currentIndex]; // Now this gets the *next* line
            console.log("background.js: Texto a ser copiado: ", textToCopy);
            const success = await copyTextUsingOffscreen(textToCopy, "Ctrl+Space");
            if (success) {
                // currentIndex is already incremented, so just save it
                chrome.storage.local.set({ currentIndex: currentIndex }, function() {
                    console.log("background.js: currentIndex atualizado para: ", currentIndex);
                    chrome.runtime.sendMessage({ action: "updateUI" }).catch(() => { /* Ignora o erro se o popup não estiver aberto */ });
                    console.log("background.js: Mensagem updateUI enviada.");
                });
            } else {
                console.error('Falha ao copiar para a área de transferência via atalho (background.js).');
                chrome.runtime.sendMessage({ action: "statusUpdate", message: "Erro ao copiar via atalho." });
            }
        } else if (lines.length > 0 && currentIndex >= lines.length) {
            console.log("Todas as linhas foram copiadas. Redefina a extensão para um novo texto.");
            chrome.runtime.sendMessage({ action: "statusUpdate", message: "Todas as linhas foram copiadas." });
        } else {
            console.log("background.js: Nenhuma linha para copiar ou índice fora dos limites.");
            chrome.runtime.sendMessage({ action: "statusUpdate", message: "Nenhuma linha para copiar." });
        }
    });
    copyTimeout = null; // Reset timeout ID
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("background.js: Mensagem recebida do popup/content: ", request.action);
    if (request.action === "initialCopy") {
        chrome.storage.local.get(['lines', 'currentIndex'], async function(result) {
            let lines = result.lines || [];
            let currentIndex = result.currentIndex || 0;
            console.log("background.js (initialCopy): Dados do storage - lines:", lines, "currentIndex:", currentIndex);

            if (lines.length > 0 && currentIndex < lines.length) {
                const textToCopy = lines[currentIndex];
                console.log("background.js (initialCopy): Texto a ser copiado: ", textToCopy);
                const success = await copyTextUsingOffscreen(textToCopy, "Começar");
                if (success) {
                    console.log("background.js (initialCopy): Cópia inicial bem-sucedida.");
                    sendResponse({ success: true });
                } else {
                    console.error("background.js (initialCopy): Falha ao copiar para a área de transferência (initial).");
                    sendResponse({ success: false, error: "Falha ao copiar para a área de transferência (initial)." });
                }
            } else {
                console.log("background.js (initialCopy): Nenhuma linha para copiar ou índice fora dos limites.");
                sendResponse({ success: false, error: "No lines to copy or index out of bounds." });
            }
        });
        return true; // Indicates that the response will be sent asynchronously
    } else if (request.action === "copyNext") {
        console.log("background.js (copyNext): Mensagem copyNext recebida.");
        chrome.storage.local.get(['lines', 'currentIndex'], async function(result) {
            let lines = result.lines || [];
            let currentIndex = result.currentIndex || 0;
            console.log("background.js (copyNext): Dados do storage - lines:", lines, "currentIndex:", currentIndex);

            if (lines.length > 0 && currentIndex < lines.length) {
                currentIndex++; // Increment for the next line
                if (currentIndex < lines.length) {
                    const textToCopy = lines[currentIndex];
                    console.log("background.js (copyNext): Texto a ser copiado: ", textToCopy);
                    const success = await copyTextUsingOffscreen(textToCopy, "Copiar Próxima");
                    if (success) {
                        chrome.storage.local.set({ currentIndex: currentIndex }, function() {
                            console.log("background.js (copyNext): currentIndex atualizado para: ", currentIndex);
                            sendResponse({ success: true });
                            chrome.runtime.sendMessage({ action: "updateUI" }).catch(() => { /* Ignora o erro se o popup não estiver aberto */ }); // Notify popup to update UI
                        });
                    } else {
                        sendResponse({ success: false, error: "Falha ao copiar para a área de transferência (copyNext)." });
                    }
                } else {
                    // All lines copied
                    console.log("background.js (copyNext): Todas as linhas foram copiadas.");
                    chrome.storage.local.set({ currentIndex: currentIndex }, function() {
                        sendResponse({ success: true, message: "Todas as linhas foram copiadas." });
                        chrome.runtime.sendMessage({ action: "updateUI" }).catch(() => { /* Ignora o erro se o popup não estiver aberto */ });
                    });
                }
            } else {
                sendResponse({ success: false, error: "No lines to copy or index out of bounds." });
            }
        });
        return true; // Indicates that the response will be sent asynchronously
    } else if (request.action === "copyPrevious") {
        console.log("background.js (copyPrevious): Mensagem copyPrevious recebida.");
        chrome.storage.local.get(['lines', 'currentIndex'], async function(result) {
            let lines = result.lines || [];
            let currentIndex = result.currentIndex || 0;
            console.log("background.js (copyPrevious): Dados do storage - lines:", lines, "currentIndex:", currentIndex);

            if (lines.length > 0 && currentIndex > 0) {
                currentIndex--; // Decrement for the previous line
                const textToCopy = lines[currentIndex];
                console.log("background.js (copyPrevious): Texto a ser copiado: ", textToCopy);
                const success = await copyTextUsingOffscreen(textToCopy, "Copiar Anterior");
                if (success) {
                    chrome.storage.local.set({ currentIndex: currentIndex }, function() {
                        console.log("background.js (copyPrevious): currentIndex atualizado para: ", currentIndex);
                        sendResponse({ success: true });
                        chrome.runtime.sendMessage({ action: "updateUI" }).catch(() => { /* Ignora o erro se o popup não estiver aberto */ }); // Notify popup to update UI
                    });
                } else {
                    sendResponse({ success: false, error: "Falha ao copiar para a área de transferência (copyPrevious)." });
                }
            } else {
                console.log("background.js (copyPrevious): Já na primeira linha ou nenhuma linha para copiar.");
                sendResponse({ success: false, error: "Already at the first line or no lines to copy." });
            }
        });
        return true; // Indicates that the response will be sent asynchronously
    } else if (request.action === "triggerNextCopy") {
        console.log("background.js: Mensagem triggerNextCopy recebida do content.js.");
        handleNextCopyLogic();
    }
});