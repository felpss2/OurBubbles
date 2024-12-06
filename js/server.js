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



app.post('/relationGroup', authenticateToken, async (req, res) => {
  const { groupId, groupPassword, userId } = req.body;

  try {
      // Ajuste na consulta SQL para usar crases ao redor de `groups`
      const [group] = await db.promise().query(
          'SELECT id, password FROM `groups` WHERE id = ?',
          [groupId]
      );

      if (group.length === 0) {
          return res.status(404).json({ error: 'Grupo não encontrado' });
      }

      // Verifica a senha do grupo
      const isPasswordCorrect = group[0].password === groupPassword;
      if (!isPasswordCorrect) {
          return res.status(401).json({ error: 'Senha do grupo incorreta' });
      }

      // Cria a relação entre usuário e grupo
      const [relation] = await db.promise().query(
          'INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)',
          [userId, groupId]
      );

      res.status(200).json({ message: 'Usuário adicionado ao grupo com sucesso!' });
  } catch (error) {
      console.error('Erro ao criar relação de grupo:', error);
      res.status(500).json({ error: 'Erro ao criar relação de grupo' });
  }
});





app.post('/login', async (req, res) => {
  const { user, password } = req.body;

  db.query('SELECT * FROM users WHERE username = ?', [user], async (err, result) => {
    if (err) throw err;

    if (result.length === 0 || !(await bcrypt.compare(password, result[0].password))) {
      return res.status(400).send('Login ou senha inválidos');
    }

    // Inclui o ID do usuário no payload do token
    const token = jwt.sign({ id: result[0].id, user: result[0].username }, SECRET_KEY, { expiresIn: '1h' });
    console.log('Payload do token:', req.user); // Deve mostrar { id, user }
    res.json({ token });
  });
});


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


// Rota para obter dados do usuário logado
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
  // Utiliza o ID do usuário extraído do token
  db.query('SELECT * FROM users WHERE id = ?', [req.user.id], (err, result) => {
    if (err) {
      console.error('Erro ao buscar usuário:', err);
      return res.status(500).json({ error: 'Erro no servidor' });
    }

    if (result.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json(result[0]); // Retorna os dados do usuário
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
  const { newEmail, newPassword } = req.body;

  if (!newEmail || !newPassword) {
    return res.status(400).json({ error: 'Novo email e senha são obrigatórios' });
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10); // Criptografa a senha
    db.query(
      'UPDATE users SET email = ?, password = ? WHERE id = ?',
      [newEmail, hashedPassword, req.user.id],
      (err, result) => {
        if (err) {
          console.error('Erro ao atualizar usuário:', err);
          return res.status(500).json({ error: 'Erro no servidor' });
        }

        if (result.affectedRows === 0) {
          return res.status(404).send('Usuário não encontrado');
        }

        res.send('Usuário atualizado com sucesso');
      }
    );
  } catch (error) {
    console.error('Erro ao criptografar senha:', error);
    res.status(500).json({ error: 'Erro ao processar dados do usuário' });
  }
});




// Rota para deletar o usuário
app.delete('/user', authenticateToken, (req, res) => {
  db.query('DELETE FROM users WHERE id = ?', [req.user.id], (err, result) => {
    if (err) {
      console.error('Erro ao deletar usuário:', err);
      return res.status(500).json({ error: 'Erro no servidor' });
    }

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
