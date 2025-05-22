// seed.js
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

    const permissionsList = [
      { name: "view_links", description: "Visualizar links" },
      { name: "edit_links", description: "Editar links" },
      { name: "delete_links", description: "Excluir links" },
      { name: "update_links", description: "Atualizar links de loja" },

      { name: "view_production", description: "Visualizar produção (jobs)" },
      { name: "edit_production", description: "Editar produção" },
      { name: "rate_production", description: "Avaliar produção" },

      { name: "manage_faccionistas", description: "Gerenciar faccionistas" },

      { name: "view_config", description: "Visualizar configurações" },
      { name: "edit_config", description: "Editar configurações" },

      { name: "view_meli_accounts", description: "Visualizar contas Mercado Livre" },
      { name: "manage_meli_products", description: "Gerenciar produtos Mercado Livre" },
    ];

    await Permission.deleteMany({});
    await Role.deleteMany({});

    const permissions = await Permission.insertMany(permissionsList);
    console.log(`✅ ${permissions.length} permissões criadas`);

    const getPermission = (name) => permissions.find(p => p.name === name)._id;

    // Role: Owner (todas permissões)
    const ownerRole = await Role.create({
      name: "owner",
      permissions: permissions.map(p => p._id),
    });

    // Role: Faccionista
    const faccionistaRole = await Role.create({
      name: "faccionista",
      permissions: [
        getPermission("view_production"),
        getPermission("view_config"),
      ],
    });

    // Role: Production
    const productionRole = await Role.create({
      name: "production",
      permissions: [
        getPermission("view_production"),
        getPermission("edit_production"),
        getPermission("rate_production"),
      ],
    });

    console.log("✅ Roles criadas: owner, faccionista, production");

    const updatedOwner = await User.updateMany({ role: "owner" }, { roleId: ownerRole._id });
    const updatedFaccionista = await User.updateMany({ role: "faccionista" }, { roleId: faccionistaRole._id });
    const updatedProduction = await User.updateMany({ role: "production" }, { roleId: productionRole._id });

    console.log("🧑‍💼 Usuários atualizados:");
    console.log(`   → Owner: ${updatedOwner.modifiedCount}`);
    console.log(`   → Faccionista: ${updatedFaccionista.modifiedCount}`);
    console.log(`   → Production: ${updatedProduction.modifiedCount}`);

    console.log("✅ Seed finalizado com sucesso");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao rodar o seed:", error);
    process.exit(1);
  }
}

seedRolesAndPermissions();
