

document.addEventListener('DOMContentLoaded', async () => {

    const token = localStorage.getItem('token'); 
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
        
       
    } else {

        messageElement.textContent = 'Erro ao obter dados do usuário.';
    }

    document.getElementById('groupRegisterForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const groupName = document.getElementById("groupName").value;
        const groupDescription = document.getElementById("groupDescription").value;
        const groupPassword = document.getElementById('groupPassword').value

        const createResponse = await fetch('http://localhost:3000/createGroup', {
            method: 'POST', // Define o método HTTP como POST, ideal para enviar dados ao servidor
            headers: { 'Content-Type': 'application/json' }, // Define o cabeçalho para indicar que os dados estão em JSON
            // Converte os valores de email e senha para uma string JSON para enviar no corpo da solicitação
            body: JSON.stringify({ groupName, groupDescription,groupPassword })
        });
        const messageElement = document.getElementById('message');


        /*preciso pegar o id do grupo e do usuário que o criou, passo então para o método junto da boolean admin, que leva um true, este que sinaliza ao banco que o usuário é
        um admin do grupo*/

        const username = userData.username;//recupera o id do usuário, nesta tela pega do usuário que está logado.
        console.log("teste", username)
        const idResponse = await fetch(`http://localhost:3000/userId?username=${encodeURIComponent(username)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        const idData = await idResponse.json(); // Extrai o corpo da resposta como JSON

        console.log(idData)

        console.log("teste", groupName)
        const groupResponse = await fetch(`http://localhost:3000/groupId?group=${encodeURIComponent(groupName)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        }); 
        let idGroup = await groupResponse.json();
        console.log(idGroup)

        if (createResponse.ok && idResponse.ok && groupResponse.ok) {


            // Se o registro for bem-sucedido, exibe uma mensagem de confirmação
            messageElement.textContent = 'Grupoo registrado com sucesso!';
            const response = await fetch('http://localhost:3000/relationGroup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupId:idGroup.id.id, userId: idData.id.id, admin: true })
            });



        } else {
            // Caso a resposta não seja bem-sucedida, extrai a mensagem de erro do corpo da resposta
            const errorMessage = await response.text();
            // Define o texto do elemento de mensagem para mostrar o erro na interface do usuário
            messageElement.textContent = errorMessage;
        }
    })

});


