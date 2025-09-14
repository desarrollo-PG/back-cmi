const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

class RolService{
    async consultarRol(){
        try{
            const rol = await prisma.rol.findMany({
                select:{
                    idrol:  true,
                    nombre: true
                },
                where:{
                    estado: 1
                }
            });

            return{
                success: true,
                data: rol
            };
        }catch(error){
            console.error("Error en rolService: ", error.message);
            throw error;
        }
    }
}

module.exports = new RolService();