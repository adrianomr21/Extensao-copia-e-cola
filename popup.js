document.addEventListener('DOMContentLoaded', function () {
    // Views
    const initialView = document.getElementById('initial-view');
    const inProgressView = document.getElementById('in-progress-view');

    // Initial View Elements
    const questionText = document.getElementById('questionText');
    const startButton = document.getElementById('startButton');

    // In-Progress View Elements
    const linesContainer = document.getElementById('lines-container');
    const copyNextButton = document.getElementById('copyNextButton');
    const copyPreviousButton = document.getElementById('copyPreviousButton');
    const resetButton = document.getElementById('resetButton');
    const status = document.getElementById('status');

    let lines = [];
    let currentIndex = 0;

    // Function to update UI based on current state from storage
    function updateUIFromStorage() {
        console.log("popup.js: updateUIFromStorage - Carregando dados do storage...");
        chrome.storage.local.get(['lines', 'currentIndex'], function (result) {
            lines = result.lines || [];
            currentIndex = result.currentIndex || 0;
            console.log("popup.js: updateUIFromStorage - Dados carregados: lines=", lines, "currentIndex=", currentIndex);

            if (lines.length > 0) {
                initialView.style.display = 'none';
                inProgressView.style.display = 'block';
                renderLines();
                updateStatus();
                updateCopyNextButtonVisibility();
                console.log("popup.js: updateUIFromStorage - Exibindo inProgressView.");
            } else {
                initialView.style.display = 'block';
                inProgressView.style.display = 'none';
                console.log("popup.js: updateUIFromStorage - Exibindo initialView.");
            }
        });
    }

    // Load state and update UI when popup opens
    updateUIFromStorage();

    startButton.addEventListener('click', () => {
        console.log("popup.js: startButton clicado.");
        const text = questionText.value;
        if (text) {
            lines = text.split('\n').filter(line => line.trim() !== '');
            currentIndex = 0;
            if (lines.length > 0) {
                console.log("popup.js: Salvando estado inicial no storage...");
                chrome.storage.local.set({ lines: lines, currentIndex: currentIndex }, function () {
                    console.log("popup.js: Estado inicial salvo. Enviando mensagem initialCopy para background.js...");
                    // Send message to background to perform initial copy
                    chrome.runtime.sendMessage({ action: "initialCopy" }, function(response) {
                        if (response && response.success) {
                            console.log("popup.js: Resposta initialCopy bem-sucedida.");
                            updateUIFromStorage(); // Update UI after successful initial copy
                        } else {
                            status.textContent = 'Erro ao iniciar cópia.';
                            console.error('popup.js: Erro ao iniciar cópia:', response.error);
                        }
                    });
                });
            } else {
                status.textContent = 'Nenhuma linha para copiar.';
                console.log("popup.js: Nenhuma linha para copiar.");
            }
        }
    });

    copyNextButton.addEventListener('click', () => {
        console.log("popup.js: copyNextButton clicado. Enviando mensagem copyNext para background.js...");
        // Send message to background to perform next copy
        chrome.runtime.sendMessage({ action: "copyNext" }, function(response) {
            if (response && response.success) {
                console.log("popup.js: Resposta copyNext bem-sucedida.");
                updateUIFromStorage(); // Update UI after successful next copy
            } else {
                status.textContent = 'Erro ao copiar próxima linha.';
                console.error('popup.js: Erro ao copiar próxima linha:', response.error);
            }
        });
    });

    copyPreviousButton.addEventListener('click', () => {
        console.log("popup.js: copyPreviousButton clicado. Enviando mensagem copyPrevious para background.js...");
        // Send message to background to perform previous copy
        chrome.runtime.sendMessage({ action: "copyPrevious" }, function(response) {
            if (response && response.success) {
                console.log("popup.js: Resposta copyPrevious bem-sucedida.");
                updateUIFromStorage(); // Update UI after successful previous copy
            } else {
                status.textContent = 'Erro ao copiar linha anterior.';
                console.error('popup.js: Erro ao copiar linha anterior:', response.error);
            }
        });
    });

    resetButton.addEventListener('click', () => {
        console.log("popup.js: resetButton clicado. Limpando storage...");
        // Clear state from storage
        chrome.storage.local.remove(['lines', 'currentIndex'], function() {
            console.log("popup.js: Storage limpo. Resetando variáveis locais e UI.");
            // Reset local variables and update UI
            lines = [];
            currentIndex = 0;
            questionText.value = '';
            linesContainer.innerHTML = '';
            status.textContent = '';
            updateUIFromStorage(); // Revert to initial view
        });
    });

    function renderLines() {
        linesContainer.innerHTML = '';
        lines.forEach((line, index) => {
            const lineElement = document.createElement('div');
            lineElement.textContent = line;
            if (index === currentIndex) {
                lineElement.classList.add('highlight');
            }
            linesContainer.appendChild(lineElement);
        });
        console.log("popup.js: Linhas renderizadas.");
    }

    function updateStatus() {
        if (lines.length > 0) {
            status.textContent = `Linha ${currentIndex + 1} de ${lines.length} copiada.`;
        } else {
            status.textContent = '';
        }
        console.log("popup.js: Status atualizado para: ", status.textContent);
    }

    function updateCopyNextButtonVisibility() {
        if (currentIndex >= lines.length - 1) {
            copyNextButton.style.display = 'none';
            console.log("popup.js: Botão 'Copiar Próxima' oculto.");
        } else {
            copyNextButton.style.display = 'inline-block';
            console.log("popup.js: Botão 'Copiar Próxima' visível.");
        }
        if (currentIndex <= 0) {
            copyPreviousButton.style.display = 'none';
            console.log("popup.js: Botão 'Copiar Anterior' oculto.");
        } else {
            copyPreviousButton.style.display = 'inline-block';
            console.log("popup.js: Botão 'Copiar Anterior' visível.");
        }
    }

    // Listen for messages from background script to update UI or status
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log("popup.js: Mensagem recebida do background: ", request.action);
        if (request.action === "updateUI") {
            updateUIFromStorage();
            console.log("popup.js: updateUI acionado.");
        } else if (request.action === "statusUpdate") {
            status.textContent = request.message;
            console.log("popup.js: Status atualizado por background: ", request.message);
        }
    });
});