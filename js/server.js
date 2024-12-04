// Importa os módulos necessários para configurar o servidor
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs'); 

const app = express();
const SECRET_KEY = 'seu_segredo_aqui'; // Substitua por um segredo seguro para gerar tokens JWT

// Middleware para habilitar o CORS (Cross-Origin Resource Sharing)
app.use(cors());
app.use(bodyParser.json()); // Middleware para processar o corpo das requisições em JSON

// Configura a conexão com o banco de dados MySQL
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root', // Ajuste conforme necessário
  password: 'root', // Insira a senha se aplicável
  database: 'ourbubbles' // Nome do banco de dados
});

// Conecta ao banco de dados e exibe mensagem de sucesso ou erro
db.connect((err) => {
  if (err) throw err;
  console.log('Conectado ao banco de dados MySQL!');
});

// Rota para registrar usuários
app.post('/register', async (req, res) => {
  const { email,user, birth, password } = req.body; // Obtém o email e senha do corpo da requisição
  const hashedPassword = await bcrypt.hash(password, 10); // Criptografa a senha para segurança

  // Verifica se o usuário já existe
  db.query('SELECT email FROM users WHERE email = ?', [email], (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      return res.status(400).send('Usuário já existe');
    }

    // Insere o novo usuário no banco de dados
    db.query('INSERT INTO users (username, email, birth, password) VALUES (?, ?, ?, ?)', [user, email,birth, hashedPassword], (err, result) => {
      if (err) throw err;
      res.send('Usuário registrado com sucesso');
    });
  });
});

app.post('/createGroup', async (req,res) => {
  const {groupName, groupDescription,groupPassword} = req.body;
  const hashedPassword = await bcrypt.hash(groupPassword, 10);
  db.query('SELECT group_name from groups where group_name = ?',[groupName],(err,result) =>{
    if (err) throw err;
    if (result.length > 0) {
      return res.status(400).send('Grupo já existe');
    }

    // Insere o novo usuário no banco de dados
    db.query('INSERT INTO groups (group_name, description, password) VALUES (?, ?, ?)', [groupName,groupDescription,hashedPassword], (err, result) => {if (err) throw err;
      res.send('Usuário registrado com sucesso');
    });
    
  })
})
app.post('/relationGroup', async (req, res) => {
  const { groupId, userId, admin } = req.body;
    db.query('INSERT INTO users_groups (admin, user_id, group_id) VALUES (?, ?, ?)', [admin, userId, groupId], (err) => {
      if (err) return res.status(500).json({ error: 'Erro ao criar relação de grupo' });

      res.send('Relacionamento criado com sucesso');
    });
  });





// Rota para login de usuários
app.post('/login', async (req, res) => {
  const { user, password } = req.body; // Obtém o email e senha do corpo da requisição

  // Consulta o usuário no banco de dados
  db.query('SELECT * FROM users WHERE username= ?', [user], async (err, result) => {
    if (err) throw err;

    // Verifica se o usuário existe e se a senha está correta
    if (result.length === 0 || !(await bcrypt.compare(password, result[0].password))) {
      return res.status(400).send('Login ou senha inválidos');
    }

    // Gera o token JWT
    const token = jwt.sign({ user }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token }); // Retorna o token ao cliente
  });
});

// Middleware para verificar o token JWT nas requisições
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    console.log('Token não fornecido');
    return res.sendStatus(401);
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      console.log('Erro ao verificar token:', err);
      return res.sendStatus(403);
    }
    console.log('Usuário autenticado:', user); // Certifique-se de que o username está correto
    req.user = user;
    next();
  });
};

// Rota para obter dados do usuário logado
app.get('/user', authenticateToken, (req, res) => {
  db.query('SELECT username, email,id FROM users WHERE username = ?', [req.user.user], (err, result) => {
    if (err) throw err;
    if (result.length === 0) {
      return res.status(404).send('Usuário não encontrado');
    }
    res.json(result[0]); 
  });
});
app.get('/userId', async (req, res) => { //retorna os dados do usuário como um json
  const { username } = req.query; 
  
  if (!username) {
    return res.status(400).json({ error: 'Username é obrigatório' });
  }

  db.query('SELECT * FROM users WHERE username = ?', [username], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Erro no servidor' });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ id: result[0] });
  });
});
app.get('/groupId', async (req, res) => { //retorna os dados do usuário como um json
  const { group } = req.query; 
  
  if (!group) {
    return res.status(400).json({ error: 'Grupo é obrigatório' });
  }

  db.query('SELECT * FROM groups WHERE group_name = ?', [group], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Erro no servidor' });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: 'Grupo não encontrado' });
    }

    res.json({ id: result[0] });
  });
});

// Rota para atualizar informações do usuário
app.put('/user', authenticateToken, async (req, res) => {
  const { newEmail, newPassword } = req.body;  // Obtém o novo email e a nova senha
  const hashedPassword = await bcrypt.hash(newPassword, 10); // Criptografa a nova senha

  // Atualiza o email e senha do usuário
  db.query('UPDATE users SET email = ?, password = ? WHERE email = ?', [newEmail, hashedPassword, req.user.email], (err, result) => {
    if (err) throw err;

    // Verifica se a atualização foi bem-sucedida
    if (result.affectedRows === 0) {
      return res.status(404).send('Usuário não encontrado');
    }

    res.send('Usuário atualizado com sucesso');
  });
});

// Rota para deletar o usuário
app.delete('/user', authenticateToken, (req, res) => {
  // Exclui o usuário com base no email do token
  db.query('DELETE FROM users WHERE email = ?', [req.user.email], (err, result) => {
    if (err) throw err;

    if (result.affectedRows === 0) {
      return res.status(404).send('Usuário não encontrado');
    }

    res.send('Usuário deletado com sucesso');
  });
});

// Inicia o servidor na porta 3000
app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});



