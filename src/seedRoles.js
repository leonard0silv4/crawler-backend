import mongoose from "mongoose";
import dotenv from "dotenv";
import Permission from "./models/Permission.js";
import Role from "./models/Role.js";
import User from "./models/User.js";

dotenv.config({ path: "../.env" });

async function seedRolesAndPermissions() {

    

  try {
    await mongoose.connect(
  `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_STRING}?retryWrites=true&w=majority`
);

    console.log("🟢 Conectado ao MongoDB");

    // Lista de permissões
    const permissionsList = [
      { name: "view_links", description: "Visualizar links" },
      { name: "edit_links", description: "Editar links" },
      { name: "delete_links", description: "Excluir links" },
      { name: "update_links", description: "Atualizar links de loja" },

      { name: "view_production", description: "Visualizar produção (jobs)" },
      { name: "edit_production", description: "Editar produção" },

      { name: "manage_faccionistas", description: "Gerenciar faccionistas" },

      { name: "view_config", description: "Visualizar configurações" },
      { name: "edit_config", description: "Editar configurações" },
    ];

    // Limpa dados antigos (opcional — só se estiver re-seedando)
    await Permission.deleteMany({});
    await Role.deleteMany({});

    const permissions = await Permission.insertMany(permissionsList);
    console.log(`✅ ${permissions.length} permissões criadas`);

    // Helper para pegar permissão por nome
    const getPermission = (name) => permissions.find(p => p.name === name)._id;

    // Owner: acesso total
    const ownerRole = await Role.create({
      name: "owner",
      permissions: permissions.map(p => p._id),
    });

    // Faccionista: acesso restrito
    const faccionistaRole = await Role.create({
      name: "faccionista",
      permissions: [
        getPermission("view_production"),
        getPermission("view_config"),
      ],
    });

    console.log("✅ Roles criadas: owner, faccionista");

    // Atualiza os usuários existentes
    const updatedOwner = await User.updateMany({ role: "owner" }, { roleId: ownerRole._id });
    const updatedFaccionista = await User.updateMany({ role: "faccionista" }, { roleId: faccionistaRole._id });

    console.log(`🧑‍💼 Usuários atualizados:`);
    console.log(`   → Owner: ${updatedOwner.modifiedCount}`);
    console.log(`   → Faccionista: ${updatedFaccionista.modifiedCount}`);

    console.log("✅ Seed finalizado com sucesso");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao rodar o seed:", error);
    process.exit(1);
  }
}

seedRolesAndPermissions();
