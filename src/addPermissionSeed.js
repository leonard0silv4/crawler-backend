// addPermission.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Permission from "./models/Permission.js";
import Role from "./models/Role.js";

dotenv.config({ path: "../.env" });

const permissionName = 'manage_products_catalog'
const permissionDescription = 'Catálogo de produtos'

async function addNewPermission() {
  try {
    await mongoose.connect(
      `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_STRING}?retryWrites=true&w=majority`
    );
    console.log("🟢 Conectado ao MongoDB");

    const existing = await Permission.findOne({ name: permissionName });
    if (existing) {
      console.log(`⚠️ Permissão ${permissionName} já existe.`);
      process.exit(0);
    }

    const permission = await Permission.create({
      name: permissionName,
      description: permissionDescription,
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
