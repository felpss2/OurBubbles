document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token'); // Pegue o token armazenado

    // Verifica se o token existe
    if (token) {
        // Função para decodificar o JWT e extrair o userId
        function decodeJWT(token) {
            const base64Url = token.split('.')[1]; // Pegando a parte do payload
            const base64 = base64Url.replace('-', '+').replace('_', '/'); // Corrigindo os caracteres para base64
            const decodedData = JSON.parse(window.atob(base64)); // Decodificando o payload
            return decodedData;
        }

        const decodedToken = decodeJWT(token); // Decodifique o token
        console.log('Token decodificado:', decodedToken);

        const userId = decodedToken.id; // Extraia o `id` do token (correto)

        // Se o userId existir, adicione ao campo oculto
        if (userId) {
            document.getElementById('userId').value = userId;
        } else {
            console.error('ID do usuário não encontrado no token.');
            document.getElementById('message').textContent = 'Erro ao obter o ID do usuário.';
        }
    } else {
        document.getElementById('message').textContent = 'Você precisa estar logado para entrar em um grupo.';
    }
});

document.getElementById('groupForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // Impede o envio padrão do formulário

    const formData = new FormData(e.target);
    const groupId = formData.get('groupId');
    const groupPassword = formData.get('groupPassword');
    const userId = formData.get('userId'); // O 'userId' é extraído do campo oculto

    console.log('Dados do formulário:', { groupId, groupPassword, userId });

    try {
        const response = await fetch('http://localhost:3000/relationGroup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                groupId,
                groupPassword,
                userId, // Passando o userId para o servidor
            }),
        });

        const data = await response.json();

        if (response.ok) {
            console.log('Grupo acessado com sucesso:', data);
            document.getElementById('message').textContent = 'Você entrou no grupo com sucesso!';
        } else {
            console.error('Erro ao acessar o grupo:', data);
            document.getElementById('message').textContent = data.error || 'Erro ao entrar no grupo.';
        }
    } catch (error) {
        console.error('Erro na requisição:', error);
        document.getElementById('message').textContent = 'Erro na requisição. Tente novamente.';
    }
});
