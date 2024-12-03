

document.addEventListener('DOMContentLoaded', async () => {
    
    const token = localStorage.getItem('token');
    console.log(token)
    
    if (!token) {
        window.location.href = 'login.html';
        return; 
    }

    // Seleciona os elementos onde as informações do usuário e mensagens serão exibidas
   
    const messageElement = document.getElementById('message');

    // Realiza uma requisição para obter os dados do usuário autenticado
    const response = await fetch('http://localhost:3000/user', {
        method: 'GET',
        headers: { 
            'Authorization': `Bearer ${token}` // Certifique-se de que o token está sendo enviado
        }
    });

   
    if (response.ok) {
      
        userData = await response.json();
        console.log(userData.username)
    } else {
        
        messageElement.textContent = 'Erro ao obter dados do usuário.';
    }
    
    document.getElementById('groupRegisterForm').addEventListener('submit',async(e) =>{
        e.preventDefault();

        const groupName = document.getElementById("groupName").value;
        const groupDescription = document.getElementById("groupDescription").value;

        const response = await fetch('http://localhost:3000/createGroup', {
            method: 'POST', // Define o método HTTP como POST, ideal para enviar dados ao servidor
            headers: { 'Content-Type': 'application/json' }, // Define o cabeçalho para indicar que os dados estão em JSON
            // Converte os valores de email e senha para uma string JSON para enviar no corpo da solicitação
            body: JSON.stringify({ groupName, groupDescription })
        });
        const messageElement = document.getElementById('message');

        if (response.ok) {
            // Se o registro for bem-sucedido, exibe uma mensagem de confirmação
            messageElement.textContent = 'Usuário registrado com sucesso!';
            
            // Usa `setTimeout` para redirecionar o usuário para a página de login após 2 segundos
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000); // Espera 2000 milissegundos (2 segundos) antes de redirecionar
        } else {
            // Caso a resposta não seja bem-sucedida, extrai a mensagem de erro do corpo da resposta
            const errorMessage = await response.text();
            // Define o texto do elemento de mensagem para mostrar o erro na interface do usuário
            messageElement.textContent = errorMessage;
        }
    })
    
});


