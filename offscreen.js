chrome.runtime.onMessage.addListener(async (message) => {
    if (message.type === 'copy_to_clipboard_offscreen') {
        try {
            // Prioritize document.execCommand('copy') for better compatibility in offscreen documents
            const textarea = document.createElement('textarea');
            textarea.value = message.text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            chrome.runtime.sendMessage({ type: 'copy_success_offscreen' });
        } catch (execErr) {
            console.error('Erro ao copiar para a área de transferência (offscreen) com document.execCommand: ', execErr);
            // Fallback to modern Clipboard API if execCommand fails (less likely to work without focus)
            try {
                await navigator.clipboard.writeText(message.text);
                chrome.runtime.sendMessage({ type: 'copy_success_offscreen' });
            } catch (err) {
                console.error('Erro ao copiar para a área de transferência (offscreen) com navigator.clipboard.writeText: ', err);
                chrome.runtime.sendMessage({ type: 'copy_fail_offscreen', error: err.message });
            }
        }
    }
});