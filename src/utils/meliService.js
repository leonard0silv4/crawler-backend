import axios from "axios";

export async function renewToken(conta) {
  const agora = new Date();
  if (agora < conta.expires_at) {
    return conta.access_token;
  }

  try {
    console.log(`Token expirado para conta ${conta.user_id}, renovando...`);

    const response = await axios.post(
      "https://api.mercadolibre.com/oauth/token",
      null,
      {
        params: {
          grant_type: "refresh_token",
          client_id: process.env.ML_CLIENT_ID,
          client_secret: process.env.ML_CLIENT_SECRET,
          refresh_token: conta.refresh_token,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    // Atualiza conta no banco
    conta.access_token = access_token;
    conta.refresh_token = refresh_token;
    conta.expires_at = new Date(Date.now() + expires_in * 1000);

    await conta.save();

    return access_token;
  } catch (err) {
    console.error("Erro ao renovar token:", err.response?.data || err.message);
    throw new Error("Falha ao renovar o token de acesso");
  }
}
