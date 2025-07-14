// addPermission.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Permission from "./models/Permission.js";
import Role from "./models/Role.js";

dotenv.config({ path: "../.env" });

async function addNewPermission() {
  try {
    await mongoose.connect(
      `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_STRING}?retryWrites=true&w=majority`
    );
    console.log("🟢 Conectado ao MongoDB");

    const existing = await Permission.findOne({ name: "add_nf" });
    if (existing) {
      console.log("⚠️ Permissão 'control_users' já existe.");
      process.exit(0);
    }

    const permission = await Permission.create({
      name: "add_nf",
      description: "Adicionar nota fiscal",
    });

    console.log("✅ Permissão criada:", permission);

    // (Opcional) adicionar à role 'owner'
    const ownerRole = await Role.findOne({ name: "owner" });
    if (ownerRole) {
      ownerRole.permissions.push(permission._id);
      await ownerRole.save();
      console.log("🔗 Permissão adicionada à role 'owner'");
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Erro ao adicionar permissão:", err);
    process.exit(1);
  }
}

addNewPermission();
