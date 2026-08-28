document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('chat-toggle-btn');
    const closeBtn = document.getElementById('chat-close-btn');
    const chatBox = document.getElementById('chat-box');
    const sendBtn = document.getElementById('chat-send-btn');
    const chatInput = document.getElementById('chat-input');
    const messagesContainer = document.getElementById('chat-messages');
    const resetBtn = document.getElementById('chat-reset-btn');

    // Πίνακας διατήρησης ιστορικού για το Gemini API (role: 'user' | 'model')
    let chatHistory = [];

    toggleBtn.addEventListener('click', () => chatBox.classList.toggle('chat-hidden'));
    closeBtn.addEventListener('click', () => chatBox.classList.add('chat-hidden'));

    sendBtn.addEventListener('click', handleSend);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });

    async function handleSend() {
        const text = chatInput.value.trim();
        if (!text) return;

        // 1. Εμφάνιση μηνύματος χρήστη στο UI
        addMessageToUI(text, 'user-message');
        chatInput.value = '';

        // 2. Προσθήκη μηνύματος χρήστη στο ιστορικό
        chatHistory.push({
            role: 'user',
            parts: [{ text: text }]
        });

        // 3. UI Loading Indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message assistant-message';
        loadingDiv.textContent = 'Σκέφτεται...';
        messagesContainer.appendChild(loadingDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        try {
            // 4. Αποστολή ΟΛΟΥ του ιστορικού στο backend
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ history: chatHistory })
            });

            const data = await response.json();
            messagesContainer.removeChild(loadingDiv);

            if (data.reply) {
                // 5. Εμφάνιση απάντησης στο UI
                addMessageToUI(data.reply, 'assistant-message');

                // 6. Προσθήκη απάντησης του AI στο ιστορικό
                chatHistory.push({
                    role: 'model',
                    parts: [{ text: data.reply }]
                });
            } else {
                addMessageToUI('Κάτι πήγε στραβά. Παρακαλώ δοκιμάστε ξανά.', 'assistant-message');
                // Αν απέτυχε, αφαιρούμε το τελευταίο ερώτημα για να μην μολυνθεί το ιστορικό
                chatHistory.pop();
            }
        } catch (error) {
            messagesContainer.removeChild(loadingDiv);
            addMessageToUI('Σφάλμα σύνδεσης με τον server.', 'assistant-message');
            chatHistory.pop();
        }
    }

    function addMessageToUI(text, className) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${className}`;
        msgDiv.textContent = text;
        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    resetBtn.addEventListener('click', resetChat);

    function resetChat() {
        // 1. Μηδενισμός του πίνακα ιστορικού
        chatHistory = [];

        // 2. Επαναφορά του UI στο αρχικό μήνυμα καλωσορίσματος
        messagesContainer.innerHTML = `
            <div class="message assistant-message">
                Γεια σου! Είμαι ο AI βοηθός του Ευκλείδη. Πώς μπορώ να σε βοηθήσω σχετικά με την εμπειρία ή τις τεχνολογίες του;
            </div>
        `;
    }
    
    window.sendSuggestedQuestion = function(chipElement) {
        chatInput.value = chipElement.textContent;
        handleSend();
    };
});
