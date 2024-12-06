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

// Função para autenticar o token JWT
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    console.log('Token não fornecido');
    return res.sendStatus(401);
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      console.log('Erro ao verificar token:', err);
      return res.sendStatus(403);
    }

    console.log('Payload do token:', decoded); // Verifique o que está sendo decodificado
    req.user = decoded; // Decoded contém { id, user }
    next();
  });
};

// Rotas de registro e autenticação
app.post('/register', async (req, res) => {
  const { email, user, birth, password } = req.body; // Obtém o email e senha do corpo da requisição
  const hashedPassword = await bcrypt.hash(password, 10); // Criptografa a senha para segurança

  db.query('SELECT email FROM users WHERE email = ?', [email], (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      return res.status(400).send('Usuário já existe');
    }

    db.query('INSERT INTO users (username, email, birth, password) VALUES (?, ?, ?, ?)', [user, email, birth, hashedPassword], (err, result) => {
      if (err) throw err;
      res.send('Usuário registrado com sucesso');
    });
  });
});

app.post('/login', async (req, res) => {
  const { user, password } = req.body;

  db.query('SELECT * FROM users WHERE username = ?', [user], async (err, result) => {
    if (err) throw err;

    if (result.length === 0 || !(await bcrypt.compare(password, result[0].password))) {
      return res.status(400).send('Login ou senha inválidos');
    }

    const token = jwt.sign({ id: result[0].id, user: result[0].username }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token });
  });
});

// Rotas para grupos
app.post('/createGroup', async (req, res) => {
  const { groupName, groupDescription, groupPassword } = req.body;
  const hashedPassword = await bcrypt.hash(groupPassword, 10);

  db.query('SELECT group_name FROM groups WHERE group_name = ?', [groupName], (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      return res.status(400).send('Grupo já existe');
    }

    db.query('INSERT INTO groups (group_name, description, password) VALUES (?, ?, ?)', [groupName, groupDescription, hashedPassword], (err, result) => {
      if (err) throw err;
      res.send('Grupo criado com sucesso');
    });
  });
});

app.post('/relationGroup', authenticateToken, async (req, res) => {
  const { groupId, groupPassword, userId } = req.body;

  try {
    const [group] = await db.promise().query('SELECT id, password FROM `groups` WHERE id = ?', [groupId]);

    if (group.length === 0) {
      return res.status(404).json({ error: 'Grupo não encontrado' });
    }

    const isPasswordCorrect = group[0].password === groupPassword;
    if (!isPasswordCorrect) {
      return res.status(401).json({ error: 'Senha do grupo incorreta' });
    }

    await db.promise().query('INSERT INTO users_groups (user_id, group_id) VALUES (?, ?)', [userId, groupId]);
    res.status(200).json({ message: 'Usuário adicionado ao grupo com sucesso!' });
  } catch (error) {
    console.error('Erro ao criar relação de grupo:', error);
    res.status(500).json({ error: 'Erro ao criar relação de grupo' });
  }
});

// Outras rotas relacionadas a usuários
app.get('/user', authenticateToken, (req, res) => {
  db.query('SELECT username, email, id FROM users WHERE id = ?', [req.user.id], (err, result) => {
    if (err) throw err;
    if (result.length === 0) {
      return res.status(404).send('Usuário não encontrado');
    }
    res.json(result[0]);
  });
});

app.get('/userId', authenticateToken, (req, res) => {
  db.query('SELECT * FROM users WHERE id = ?', [req.user.id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Erro no servidor' });
    if (result.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(result[0]);
  });
});

app.put('/user', authenticateToken, async (req, res) => {
  const { newEmail, newPassword } = req.body;
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  db.query('UPDATE users SET email = ?, password = ? WHERE id = ?', [newEmail, hashedPassword, req.user.id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Erro no servidor' });
    if (result.affectedRows === 0) return res.status(404).send('Usuário não encontrado');
    res.send('Usuário atualizado com sucesso');
  });
});

app.delete('/user', authenticateToken, (req, res) => {
  db.query('DELETE FROM users WHERE id = ?', [req.user.id], (err, result) => {
    if (err) return res.status(500).json({ error: 'Erro no servidor' });
    if (result.affectedRows === 0) return res.status(404).send('Usuário não encontrado');
    res.send('Usuário deletado com sucesso');
  });
});

// Inicia o servidor na porta 3000
app.listen(3000, () => {
  console.log('Servidor rodando na porta 3000');
});
