let dadosGeraisBanco = {}; 
let idRastreioGPS = null; 
let mapaLeaflet = null; 
let marcadorAutocarro = null; 
let referenciaEscutaRealtime = null; 

document.addEventListener('DOMContentLoaded', () => {
    // 1. CONFIGURAÇÃO DO SEU FIREBASE REALTIME DATABASE
    const firebaseConfig = {
        apiKey: "AIzaSyC5ZzXiOe8-Zad44M-AMRc8Yczb5nVurpU",
        authDomain: "onibusnaestrada-ad313.firebaseapp.com",
        databaseURL: "https://onibusnaestrada-ad313-default-rtdb.firebaseio.com",
        projectId: "onibusnaestrada-ad313",
        storageBucket: "onibusnaestrada-ad313.firebasestorage.app",
        messagingSenderId: "432204344739",
        appId: "1:432204344739:web:8b89dd476d59578fabbe16",
        measurementId: "G-LZFC78XWFW"
    };

    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    const database = firebase.database();

    const usuario = JSON.parse(localStorage.getItem('usuarioLogado'));
    
    // VALIDAÇÃO DE SEGURANÇA: Se não estiver logado, desce para a pasta pública
    if (!usuario) { 
        window.location.href = 'Pagina Pública/login.html'; 
        return; 
    }

    // Aplica o nome do usuário logado na tela
    document.getElementById('user-name').innerText = usuario.nome;
    const content = document.getElementById('dashboard-content');

    // Busca a estrutura de cidades e rotas do banco de dados
    database.ref('cidades_rotas').once('value').then((snapshot) => {
        if (snapshot.exists()) {
            dadosGeraisBanco = snapshot.val();
            const listaCidades = Object.keys(dadosGeraisBanco);

            if (usuario.perfil === 'motorista') {
                // Rastreia no banco qual rota pertence ao motorista logado
                const rotaVinculada = encontrarRotaDoMotorista(usuario.nome);
                if (rotaVinculada) {
                    montarTelaMotoristaAutomatica(content, rotaVinculada);
                } else {
                    content.innerHTML = `<div class="card"><h2 style="text-align:center;">Você não está vinculado a nenhuma rota hoje.</h2></div>`;
                }
            } else {
                montarTelaEstudante(content, listaCidades);
            }
        } else {
            content.innerHTML = `<div class="card"><p style="text-align:center; color:#ffcc00;">Nenhuma rota cadastrada no Firebase.</p></div>`;
        }
    }).catch((error) => {
        console.error("Erro ao conectar ao Firebase:", error);
        content.innerHTML = `<div class="card"><p style="text-align:center; color:red;">Erro de conexão com o banco de dados.</p></div>`;
    });
});

// Varre o banco para achar de forma automática o trabalho do motorista
function encontrarRotaDoMotorista(nomeMotorista) {
    for (const city in dadosGeraisBanco) {
        const routes = dadosGeraisBanco[city].rotas;
        for (const rName in routes) {
            if (routes[rName].motorista === nomeMotorista) {
                return { cidade: city, nomeRota: rName, detalhes: routes[rName] };
            }
        }
    }
    return null;
}

// ===================================================
// INTERFACE DO MOTORISTA (TRANSMISSÃO DO GPS)
// ===================================================
function montarTelaMotoristaAutomatica(content, rota) {
    content.innerHTML = `
        <div class="card">
            <h2>Sua Rota Ativa</h2>
            <p>📍 <b>Cidade Polo:</b> ${rota.cidade} | 🚌 <b>Linha:</b> ${rota.nomeRota}</p>
        </div>

        <div class="card">
            <h2>Controle de Comando</h2>
            <button class="btn-acao" style="background-color: #27ae60; color: white;" 
                onclick="iniciarViagemComGPS('${rota.cidade}', '${rota.nomeRota}')">
                ▶ Iniciar Viagem (Ativar GPS)
            </button>
            <button class="btn-acao" style="background-color: #e67e22; color: white;" 
                onclick="abrirModalAtrasoDirect('${rota.cidade}', '${rota.nomeRota}')">
                ⚠️ Reportar Atraso
            </button>
            <button class="btn-acao" style="background-color: #7f8c8d; color: white;" 
                onclick="encerrarViagemComGPS('${rota.cidade}', '${rota.nomeRota}')">
                ⏹ Encerrar Viagem (Desligar GPS)
            </button>
        </div>
    `;
}

function iniciarViagemComGPS(cidade, rota) {
    alterarStatusMotoristaDirect(cidade, rota, 'Em Rota', 'Tudo fluindo normalmente');

    if (navigator.geolocation) {
        idRastreioGPS = navigator.geolocation.watchPosition((position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            // Envia as coordenadas para a subpasta da rota específica
            firebase.database().ref(`cidades_rotas/${cidade}/rotas/${rota}/gps`).set({
                latitude: lat,
                longitude: lng,
                ultimaAtualizacao: new Date().toLocaleTimeString()
            });
        }, (error) => { 
            console.error(error); 
        }, { enableHighAccuracy: true, maximumAge: 0 });
        
        Swal.fire({ title: 'GPS Ativado!', text: 'Sua localização está sendo transmitida.', icon: 'success', background: '#06241e', color: 'white' });
    }
}

function encerrarViagemComGPS(cidade, rota) {
    alterarStatusMotoristaDirect(cidade, rota, 'Fora de Operação', 'Viagem concluída');
    if (idRastreioGPS) {
        navigator.geolocation.clearWatch(idRastreioGPS);
        idRastreioGPS = null;
    }
    Swal.fire({ title: 'Viagem Encerrada', text: 'Transmissão de GPS desligada.', icon: 'info', background: '#06241e', color: 'white' });
}

// ===================================================
// INTERFACE DO ESTUDANTE (RECEPÇÃO E MAPA REATIVO)
// ===================================================
function montarTelaEstudante(content, listaCidades) {
    let opcoesCidades = listaCidades.map(c => `<option value="${c}">${c}</option>`).join('');

    content.innerHTML = `
        <div class="card">
            <h2>Onde Você Vai Embarcar?</h2>
            <label>Cidade:</label>
            <select id="est-cidade" onchange="atualizarRotasDisponiveis()">
                <option value="">-- Escolha a Cidade --</option>
                ${opcoesCidades}
            </select>

            <label style="margin-top:10px;">Rota Desejada:</label>
            <select id="est-rota" onchange="ativarMonitoramentoEstudante()">
                <option value="">-- Selecione a Cidade Primeiro --</option>
            </select>
        </div>

        <div id="painel-monitoramento" style="display:none;">
            <div class="card">
                <h2>Status: <span id="est-status-badge" class="status-badge">Carregando...</span></h2>
                <p>📢 <b>Aviso do Painel:</b> <span id="est-motivo">-</span></p>
            </div>

            <div class="card">
                <h2>Informações de Itinerário</h2>
                <p>Trajeto: <span id="est-itinerario" style="color:#aaa;">-</span></p>
                <p>⏰ Horários: Saída <span id="est-inicio" style="color:#ffcc00;">--:--</span> | Chegada <span id="est-chegada" style="color:#ffcc00;">--:--</span></p>
                <p>Condutor: <span id="est-motorista" style="color:#aaa;">-</span></p>
            </div>

            <div class="card">
                <h2>Localização do Ônibus no Mapa</h2>
                <div id="mapa-placeholder-texto">Aguardando sinal de GPS...</div>
                <div id="mapa-gps"></div>
            </div>
        </div>
    `;
}

function atualizarRotasDisponiveis() {
    const cidadeSelecionada = document.getElementById(`est-cidade`).value;
    const selectRota = document.getElementById(`est-rota`);
    document.getElementById('painel-monitoramento').style.display = 'none';

    if (!cidadeSelecionada) return;

    const rotasDaCidade = Object.keys(dadosGeraisBanco[cidadeSelecionada].rotas);
    selectRota.innerHTML = '<option value="">-- Selecione a Rota --</option>';
    rotasDaCidade.forEach(r => selectRota.innerHTML += `<option value="${r}">${r}</option>`);
}

// Funções espelho de compatibilidade com os seletores antigos do HTML
function activarMonitoramentoEstudante() { ativarMonitoramentoEstudante(); }
function activarMapaEstudanteRealtime() { ativarMonitoramentoEstudante(); }

function ativarMonitoramentoEstudante() {
    const cidade = document.getElementById('est-cidade').value;
    const rota = document.getElementById('est-rota').value;
    const painel = document.getElementById('painel-monitoramento');

    if (!cidade || !rota) { painel.style.display = 'none'; return; }
    painel.style.display = 'block';

    // Remove escutas anteriores para otimizar a velocidade do aplicativo
    if (referenciaEscutaRealtime) referenciaEscutaRealtime.off();

    referenciaEscutaRealtime = firebase.database().ref(`cidades_rotas/${cidade}/rotas/${rota}`);
    
    // Escuta em tempo real todas as atualizações da rota escolhida
    referenciaEscutaRealtime.on('value', (snapshot) => {
        if (snapshot.exists()) {
            const dados = snapshot.val();
            
            document.getElementById('est-itinerario').innerText = dados.itinerario || '-';
            document.getElementById('est-inicio').innerText = dados.inicio || '--:--';
            document.getElementById('est-chegada').innerText = dados.chegada || '--:--';
            document.getElementById('est-motorista').innerText = dados.motorista || '-';
            document.getElementById('est-motivo').innerText = dados.motivo || '-';

            const badge = document.getElementById('est-status-badge');
            badge.innerText = dados.status;
            badge.className = dados.status === "Em Rota" ? "status-badge status-verde" : (dados.status === "Atrasado" ? "status-badge status-amarelo" : "status-badge status-cinza");

            // Verifica se o GPS está ativo (enviado pelo motorista ou simulador Java)
            if (dados.gps && dados.gps.latitude && dados.gps.longitude) {
                document.getElementById('mapa-gps').style.display = 'block';
                document.getElementById('mapa-placeholder-texto').style.display = 'none';

                const lat = dados.gps.latitude;
                const lng = dados.gps.longitude;

                // Inicializa o Leaflet se ele ainda não estiver renderizado na div
                if (!mapaLeaflet) {
                    mapaLeaflet = L.map('mapa-gps').setView([lat, lng], 15);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(mapaLeaflet);
                    marcadorAutocarro = L.marker([lat, lng]).addTo(mapaLeaflet).bindPopup("<b>Ônibus está aqui!</b>").openPopup();
                } else {
                    // Se já existir, apenas desloca o marcador suavemente
                    marcadorAutocarro.setLatLng([lat, lng]);
                    mapaLeaflet.setView([lat, lng]);
                }
            } else {
                document.getElementById('mapa-gps').style.display = 'none';
                document.getElementById('mapa-placeholder-texto').style.display = 'block';
                document.getElementById('mapa-placeholder-texto').innerText = "Aguardando sinal de GPS do motorista...";
            }
        }
    });
}

function alterarStatusMotoristaDirect(cidade, rota, status, motivo) {
    firebase.database().ref(`cidades_rotas/${cidade}/rotas/${rota}`).update({ status: status, motivo: motivo });
}

function abrirModalAtrasoDirect(cidade, rota) {
    Swal.fire({
        title: 'Qual o motivo do atraso?',
        input: 'select',
        inputOptions: { 'Trânsito': 'Trânsito Pesado', 'Mecânico': 'Problema Mecânico / Pneu Furado', 'Chuva': 'Chuva Forte' },
        background: '#06241e', color: 'white', confirmButtonColor: '#ffcc00', showCancelButton: true
    }).then((result) => {
        if (result.isConfirmed && result.value) {
            alterarStatusMotoristaDirect(cidade, rota, 'Atrasado', result.value);
        }
    });
}

// ===================================================
// LOGOUT: Limpa a sessão e desce para a pasta pública
// ===================================================
function logout() { 
    localStorage.removeItem('usuarioLogado'); 
    window.location.href = 'login.html'; 
}
