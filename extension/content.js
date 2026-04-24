// Verifica a acessibilidade básica da página atual
function checkAccessibility() {
    const images = document.querySelectorAll('img');
    let missingAltCount = 0;
    
    for (let i = 0; i < images.length; i++) {
        if (!images[i].hasAttribute('alt') || images[i].getAttribute('alt').trim() === '') {
            missingAltCount++;
        }
    }

    if (missingAltCount > 0) {
        console.warn(`Sentinela Acessibilidade: ${missingAltCount} imagem(ns) sem a tag 'alt' detectada(s).`);
        // Aqui o grupo de front-end pode implementar um selo visual discreto na tela
    }
}

// Cria o overlay na tela caso a API detecte perigo
function createAlertOverlay(status, reason) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(220, 38, 38, 0.95)'; // Vermelho forte
    overlay.style.zIndex = '9999999';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.color = '#ffffff';
    overlay.style.fontFamily = 'Arial, sans-serif';
    overlay.style.textAlign = 'center';
    overlay.style.padding = '20px';

    overlay.innerHTML = `
        <h1 style="font-size: 3rem; margin-bottom: 10px;">⚠️ ALERTA DE SEGURANÇA</h1>
        <h2 style="font-size: 2rem; margin-bottom: 20px;">${status}</h2>
        <p style="font-size: 1.2rem; margin-bottom: 40px; max-width: 600px;">
            O Sentinela bloqueou esta página pelo seguinte motivo:<br>
            <strong>${reason}</strong>
        </p>
        <button id="btn-voltar" style="padding: 15px 30px; font-size: 1.2rem; background-color: #ffffff; color: #dc2626; border: none; border-radius: 8px; cursor: pointer; margin-bottom: 15px; font-weight: bold;">
            Sair desta página (Recomendado)
        </button>
        <button id="btn-ignorar" style="padding: 10px 20px; font-size: 1rem; background-color: transparent; color: #ffffff; border: 1px solid #ffffff; border-radius: 8px; cursor: pointer;">
            Ignorar aviso e continuar (Inseguro)
        </button>
    `;

    document.body.appendChild(overlay);

    document.getElementById('btn-voltar').addEventListener('click', () => {
        window.history.back(); // Tenta voltar para a página anterior
    });

    document.getElementById('btn-ignorar').addEventListener('click', () => {
        overlay.remove(); // Fecha o alerta
    });
}

// Comunica com o backend FastAPI para checar a URL
async function verifySite() {
    const currentUrl = window.location.href;
    
    try {
        const response = await fetch('http://127.0.0.1:8000/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: currentUrl })
        });
        
        if (!response.ok) {
            console.error("Erro na comunicação com o servidor Sentinela.");
            return;
        }

        const data = await response.json();
        
        if (data.is_danger) {
            createAlertOverlay(data.status, data.reason);
        }
    } catch (error) {
        console.error("Falha ao tentar verificar a URL:", error);
    }
}

// Execução das funções assim que o script é carregado
checkAccessibility();
verifySite();