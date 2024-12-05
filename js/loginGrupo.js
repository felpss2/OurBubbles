document.getElementById('enterGroupForm').addEventListener('submit', async (e) => {
    // Previne o comportamento padrão de envio do formulário
    e.preventDefault();

    // Obtém os valores dos campos de entrada
    const groupId = document.getElementById('groupId').value;
    const groupPassword = document.getElementById('groupPassword').value;

    // Envia uma solicitação para verificar se o grupo existe e pegar a senha
    const response = await fetch(`http://localhost:3000/groupId?group=${groupId}`);
    const groupData = await response.json();

    if (groupData.error) {
        document.getElementById('message').textContent = groupData.error;
        return;
    }

    // Compara a senha informada com a do grupo no banco
    const isPasswordCorrect = await comparePassword(groupPassword, groupData.password);

    if (!isPasswordCorrect) {
        document.getElementById('message').textContent = 'Senha incorreta!';
        return;
    }

    // Se a senha estiver correta, faz a relação entre o usuário e o grupo
    const token = localStorage.getItem('token');
    if (!token) {
        document.getElementById('message').textContent = 'Você precisa estar autenticado.';
        return;
    }

    // Envia o request para adicionar o usuário ao grupo
    const userId = decodeJwt(token).userId; // Supondo que o token tenha o ID do usuário
    const addUserToGroupResponse = await fetch('http://localhost:3000/relationGroup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ groupId, userId, admin: false })
    });

    if (addUserToGroupResponse.ok) {
        document.getElementById('message').textContent = 'Você entrou no grupo com sucesso!';
    } else {
        const errorMessage = await addUserToGroupResponse.text();
        document.getElementById('message').textContent = errorMessage;
    }
});

// Função para comparar a senha do grupo
async function comparePassword(inputPassword, storedPasswordHash) {
    const response = await fetch('http://localhost:3000/comparePassword', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ inputPassword, storedPasswordHash })
    });

    const result = await response.json();
    return result.isMatch;
}

// Função para decodificar o JWT e obter o userId
function decodeJwt(token) {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
}
