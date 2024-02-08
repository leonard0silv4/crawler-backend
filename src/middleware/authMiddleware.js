import jwt from 'jsonwebtoken'
import 'dotenv/config'

const verifyJWT = {
 isTokenized(req, res, next){
    const token = req.headers['authorization']?.split(" ")?.[1];
        
    if (!token) return res.status(401).json({ auth: false, message: 'Nenhum token fornecido' });
    
    jwt.verify(token, process.env.SECRET, function(err, decoded) {
      
      if (err) {
        if(err.name === 'TokenExpiredError') return res.status(440).json({ auth: false, message: 'Ops, sessão expirada' });
        return res.status(500).json({ auth: false, message: 'Falha ao autenticar o token' });
      }
      next();
    });
},

recoverUid(req, res){
  const token = req.headers['authorization']?.split(" ")?.[1];
  return jwt.verify(token, process.env.SECRET, function(err, decoded){
    const {userId} = decoded;
      return userId
  })
}

}

export default verifyJWT;
