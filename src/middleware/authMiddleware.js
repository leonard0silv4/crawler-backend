import jwt from 'jsonwebtoken'
import 'dotenv/config'
import User from '../models/User.js';

const verifyJWT = {
 isTokenized(req, res, next){
    const token = req.headers['authorization']?.split(" ")?.[1];
        
    if (!token) return res.status(401).json({ auth: false, message: 'Nenhum token fornecido' });
    
    jwt.verify(token, process.env.SECRET, function(err, decoded) {
      
      if (err) {
        console.log(err)
        if(err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError' ) return res.status(440).json({ auth: false, message: 'Ops, sessão expirada' });
        return res.status(500).json({ auth: false, message: 'Falha ao autenticar o token' });
      }
      next();
    });
},

async recoverRole(req, res) {
  const token = req.headers['authorization']?.split(" ")?.[1];
  return jwt.verify(token, process.env.SECRET, function (err, decoded) {
    let { roleUser } = decoded;
    if (typeof roleUser === "string" && (roleUser.startsWith('"') || roleUser.startsWith("'"))) {
      roleUser = JSON.parse(roleUser);
    }
    return roleUser;
  });
},

recoverUid(req, res){
  const token = req.headers['authorization']?.split(" ")?.[1];
  return jwt.verify(token, process.env.SECRET, function(err, decoded){
    const {userId} = decoded;
      return userId
  })
},

async recoverAuth(req, res) {
  const token = req.headers['authorization']?.split(" ")?.[1];
  if (!token) throw new Error("Token ausente");

  const decoded = jwt.verify(token, process.env.SECRET);
  const user = await User.findById(decoded.userId);

  if (!user) throw new Error("Usuário inválido");

  return {
    userId: user._id,
    role: user.role,
    ownerId: user.ownerId ?? user._id,
  };
}

}

export default verifyJWT;
