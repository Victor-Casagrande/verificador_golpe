// Configurações Globais do SentryVZN (Facilita a migração de Localhost para Nuvem)
const SENTRY_CONFIG = {
    // Alterar esta URL quando fizer o deploy da API (ex: https://api.sentryvzn.com.br)
    API_URL: 'http://localhost:3000',
    // Tempo máximo de espera para a resposta da API (em milissegundos)
    TIMEOUT_MS: 10000 
};

// Cria o overlay no ecrã caso a API detecte perigo (Protegido contra XSS via textContent)
function createAlertOverlay(status, reason) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(220, 38, 38, 0.95)';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.color = '#ffffff';
    overlay.style.fontFamily = 'Arial, sans-serif';
    overlay.style.textAlign = 'center';
    overlay.style.padding = '20px';

    // Estrutura estática segura
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

    // Injeção de dados dinâmica e segura
    overlay.querySelector('#sentry-status-text').textContent = status;
    overlay.querySelector('#sentry-reason-text').textContent = reason;

    document.body.appendChild(overlay);

    document.getElementById('btn-voltar').addEventListener('click', () => {
        window.history.back(); // Tenta voltar para a página anterior
    });

    document.getElementById('btn-ignorar').addEventListener('click', () => {
        overlay.remove(); // Fecha o alerta
    });
}

// Executa a auditoria de acessibilidade garantindo que a biblioteca está presente
async function runAccessibilityAudit() {
    // Trava de segurança para evitar quebra silenciosa se o manifest.json falhar na injeção
    if (typeof axe === 'undefined') {
        console.warn("SentryVZN: Biblioteca Axe-core não encontrada no contexto da página. A saltar auditoria.");
        return [];
    }

    try {
        const results = await axe.run();
        return results.violations;
    } catch (error) {
        console.error("SentryVZN: Erro ao executar a auditoria de acessibilidade do Axe-core:", error);
        return [];
    }
}

// Unifica o fluxo: avalia acessibilidade localmente e envia o payload consolidado para a API
async function verifySiteAndAccessibility() {
    const currentUrl = window.location.href;
    const accessibilityReport = await runAccessibilityAudit();

    // Correção: Uso de AbortController para implementar Timeout no pedido HTTP
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SENTRY_CONFIG.TIMEOUT_MS);

    try {
        // Correção: Rota baseada em configuração dinâmica
        const endpoint = `${SENTRY_CONFIG.API_URL}/urls/analyze`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                url: currentUrl,
                accessibility_report: accessibilityReport
            }),
            signal: controller.signal // Associa o cancelamento ao pedido
        });

        clearTimeout(timeoutId); // Limpa o timeout se a resposta chegar antes do limite

        if (!response.ok) {
            console.error("Erro na comunicação com o servidor SentryVZN. Código HTTP:", response.status);
            return;
        }

        const data = await response.json();

        if (data.security && data.security.is_danger) {
            createAlertOverlay(data.security.status, data.security.reason);
        }
    } catch (error) {
        clearTimeout(timeoutId); // Garante a limpeza em caso de erro de rede
        
        // Intercepta especificamente o erro de interrupção por tempo
        if (error.name === 'AbortError') {
            console.error(`SentryVZN: O servidor demorou mais de ${SENTRY_CONFIG.TIMEOUT_MS / 1000} segundos a responder. Pedido cancelado para não bloquear o navegador.`);
        } else {
            console.error("SentryVZN: Falha ao tentar verificar a URL e a acessibilidade na rede:", error);
        }
    }
}

// Resolve a Condição de Corrida aguardando o carregamento completo da página
window.addEventListener('load', () => {
    verifySiteAndAccessibility();
});