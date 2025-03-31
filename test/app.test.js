const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const { userModel } = require('../models');

describe('User API', () => {
    let token = '';
    let verificationCode = '';
    const testUser = {
        "email": "testEmail@gmail.com",
        "password": "123456789",
        "firstName": "test",
        "lastName": "Da Silva"
    };

    // Emails para las pruebas de invitaciones
    const inviterEmail = 'inviter@example.com';
    const inviteeEmail = 'invitee@example.com';
    let inviterToken, inviteeToken;
    let inviterId, inviteeId;

    // Antes de todas las pruebas, limpiamos la base de datos
    beforeAll(async () => {
        // eliminar las pruebas de la base de datos
        await userModel.deleteMany({
            email: {
                $in: [
                    testUser.email,
                    'unverified@example.com',
                    'invited@example.com',
                    inviterEmail,
                    inviteeEmail,
                    'invalid.login@test.com'
                ]
            }
        });
    });

    // Después de todas las pruebas, limpiamos la base de datos
    afterAll(async () => {
        await userModel.deleteMany({ email: { $in: [testUser.email, 'unverified@example.com', 'invited@example.com'] } });
    });

    it('should register a user', async () => {
        const response = await request(app)
            .post('/api/user/register')
            .send(testUser)
            .set('Accept', 'application/json')
            .expect(200);

        expect(response.body.user.email).toEqual(testUser.email);
        expect(response.body.token).toBeDefined();



        token = response.body.token;
        userId = response.body.user._id;
        verificationCode = response.body.user.code;
    });

    it('should verify user email', async () => {
        const response = await request(app)
            .put('/api/user/verify')
            .send({
                email: testUser.email,
                code: verificationCode
            })
            .set('Accept', 'application/json')
            .expect(200);

        expect(response.body.message).toEqual('EMAIL_VALIDATED');
    });

    it('should login a user', async () => {
        const response = await request(app)
            .post('/api/user/login')
            .send({
                email: testUser.email,
                password: testUser.password
            })
            .set('Accept', 'application/json')
            .expect(200);

        expect(response.body.user.email).toEqual(testUser.email);
        expect(response.body.token).toBeDefined();
        token = response.body.token; // Actualizamos el token con el nuevo
    });

    it('should get user profile', async () => {
        // Intentar primero con formato exacto Bearer {token}
        const response = await request(app)
            .get('/api/user/profile')
            .set('Authorization', `Bearer ${token}`)
            .set('Accept', 'application/json')
            .expect(200);

        expect(response.body.email).toEqual(testUser.email);
        expect(response.body.firstName).toEqual(testUser.firstName);
        expect(response.body.lastName).toEqual(testUser.lastName);
    });

    it('should update user information', async () => {
        const updatedInfo = {
            firstName: 'Updated',
            lastName: 'Name'
        };

        const response = await request(app)
            .patch('/api/user')
            .send(updatedInfo)
            .set('Authorization', `Bearer ${token}`)
            .set('Accept', 'application/json')
            .expect(200);

        expect(response.body.firstName).toEqual(updatedInfo.firstName);
        expect(response.body.lastName).toEqual(updatedInfo.lastName);
    });

    const patchCompany = async (req, res) => {
        try {
            const user = req.user;
            const { company } = req.body;

            if (!company) {
                return handleHttpError(res, "COMPANY_DATA_REQUIRED", 400);
            }

            // Verificar si hay conflictos con nombre o CIF de compañía
            if (company.name || company.cif) {
                const nameExists = company.name && await userModel.findOne({
                    'company.name': company.name,
                    _id: { $ne: user._id }
                });

                const cifExists = company.cif && await userModel.findOne({
                    'company.cif': company.cif,
                    _id: { $ne: user._id }
                });

                if (nameExists) {
                    return handleHttpError(res, "COMPANY_NAME_ALREADY_EXISTS", 409);
                }

                if (cifExists) {
                    return handleHttpError(res, "COMPANY_CIF_ALREADY_EXISTS", 409);
                }
            }

            // Actualizar la compañía
            const updatedUser = await userModel.findByIdAndUpdate(
                user._id,
                { $set: { company } },
                { new: true }
            );

            // Devolver solo la respuesta que espera el test
            return res.send(updatedUser);
        } catch (err) {
            handleHttpError(res, "ERROR_PATCH_COMPANY", 500);
        }
    };


    it('should create a recover password code', async () => {
        const response = await request(app)
            .post('/api/user/recover')
            .send({ email: testUser.email })
            .set('Accept', 'application/json')
            .expect(200);

        expect(response.body.message).toBeDefined();

        // Modificamos el código en la base de datos para la prueba
        await userModel.findOneAndUpdate(
            { email: testUser.email },
            { code: '1234' }
        );
    });

    it('should recover password with code', async () => {
        const newPassword = 'NewPassword123';

        const response = await request(app)
            .patch('/api/user/recover')
            .send({
                email: testUser.email,
                code: '1234',
                password: newPassword
            })
            .set('Accept', 'application/json')
            .expect(200);

        expect(response.body.message).toEqual('PASSWORD_UPDATED');

        // Actualizar contraseña en el objeto para pruebas posteriores
        testUser.password = newPassword;
    });

    it('should login with new password', async () => {
        const response = await request(app)
            .post('/api/user/login')
            .send({
                email: testUser.email,
                password: testUser.password
            })
            .set('Accept', 'application/json')
            .expect(200);

        expect(response.body.user.email).toEqual(testUser.email);
        expect(response.body.token).toBeDefined();

        token = response.body.token;
    });

    it('should invite another user', async () => {
        // Registrar primero un usuario para invitar
        const invitedUser = {
            firstName: 'Invited',
            lastName: 'User',
            email: 'invited@example.com',
            password: 'Invited123'
        };

        await request(app)
            .post('/api/user/register')
            .send(invitedUser)
            .set('Accept', 'application/json');

        const response = await request(app)
            .patch('/api/user/invite')
            .send({
                email: invitedUser.email,
                role: 'user'
            })
            .set('Authorization', `Bearer ${token}`)
            .set('Accept', 'application/json')
            .expect(200);

        expect(response.body).toBeDefined();
    });

    it('should delete user (soft delete)', async () => {
        const response = await request(app)
            .delete('/api/user?soft=true')
            .set('Authorization', `Bearer ${token}`)
            .set('Accept', 'application/json')
            .expect(200);

        expect(response.body.message).toEqual('USER_DELETED_SOFT');
    });

    it('should handle invalid login attempts', async () => {
        try {
            // Crear un usuario de prueba específico para este test
            const testUserForInvalidLogin = {
                firstName: 'Invalid',
                lastName: 'Login',
                email: 'invalid.login@test.com',
                password: 'ValidPassword123'
            };

            // Registrar el usuario
            await request(app)
                .post('/api/user/register')
                .send(testUserForInvalidLogin)
                .set('Accept', 'application/json');

            // Verificar explícitamente que el usuario exista
            const registeredUser = await userModel.findOne({ email: testUserForInvalidLogin.email });

            if (!registeredUser) {
                throw new Error('Test user was not created properly');
            }
            await userModel.findOneAndUpdate(
                { email: testUserForInvalidLogin.email },
                {
                    'accountStatus.validated': true,
                    'validated': true
                }
            );
            // Verificar que la actualización fue exitosa para luego hacer el test
            const validatedUser = await userModel.findOne({ email: testUserForInvalidLogin.email });

            // Intentar iniciar sesión con la contraseña incorrecta
            const response = await request(app)
                .post('/api/user/login')
                .send({
                    email: testUserForInvalidLogin.email,
                    password: 'WrongPassword123'  // Contraseña incorrecta
                })
                .set('Accept', 'application/json');


            expect(response.status).toBe(401);
            expect(response.body.error).toEqual('INVALID_PASSWORD');
        } catch (error) {
            throw error;
        }
    });

    it('should handle login to unverified account', async () => {
        // Registramos un usuario nuevo sin verificar
        const unverifiedUser = {
            firstName: 'Unverified',
            lastName: 'User',
            email: 'unverified@example.com',
            password: 'Unverified123'
        };

        await request(app)
            .post('/api/user/register')
            .send(unverifiedUser)
            .set('Accept', 'application/json');

        // Intentamos iniciar sesión con el usuario sin verificar
        const response = await request(app)
            .post('/api/user/login')
            .send({
                email: unverifiedUser.email,
                password: unverifiedUser.password
            })
            .set('Accept', 'application/json')
            .expect(401);

        expect(response.body.error).toEqual('EMAIL_NOT_VALIDATED');
    });

    it('should handle non-existent user', async () => {
        const response = await request(app)
            .post('/api/user/login')
            .send({
                email: 'nonexistent@example.com',
                password: 'Password123'
            })
            .set('Accept', 'application/json')
            .expect(404);

        expect(response.body.error).toEqual('USER_NOT_EXISTS');
    });
    describe('Invitation functionality', () => {
        // Configuración para pruebas de invitaciones
        beforeAll(async () => {
            // Crear usuarios para las pruebas de invitaciones
            const inviterUser = {
                firstName: 'Inviter',
                lastName: 'User',
                email: inviterEmail,
                password: 'Password123'
            };

            const inviteeUser = {
                firstName: 'Invitee',
                lastName: 'User',
                email: inviteeEmail,
                password: 'Password123'
            };

            // Registrar usuario invitador
            const inviterResponse = await request(app)
                .post('/api/user/register')
                .send(inviterUser)
                .set('Accept', 'application/json');

            // Verificar usuario invitador
            await userModel.findOneAndUpdate(
                { email: inviterEmail },
                {
                    'accountStatus.validated': true,
                    'validated': true
                }
            );

            // Registrar usuario invitado
            const inviteeResponse = await request(app)
                .post('/api/user/register')
                .send(inviteeUser)
                .set('Accept', 'application/json');

            // Verificar usuario invitado
            await userModel.findOneAndUpdate(
                { email: inviteeEmail },
                {
                    'accountStatus.validated': true,
                    'validated': true
                }
            );

            // Login de usuario invitador
            const loginInviterResponse = await request(app)
                .post('/api/user/login')
                .send({
                    email: inviterEmail,
                    password: 'Password123'
                })
                .set('Accept', 'application/json');

            inviterToken = loginInviterResponse.body.token;

            // Login de usuario invitado
            const loginInviteeResponse = await request(app)
                .post('/api/user/login')
                .send({
                    email: inviteeEmail,
                    password: 'Password123'
                })
                .set('Accept', 'application/json');

            inviteeToken = loginInviteeResponse.body.token;

            // Obtener IDs
            const inviter = await userModel.findOne({ email: inviterEmail });
            const invitee = await userModel.findOne({ email: inviteeEmail });

            inviterId = inviter._id;
            inviteeId = invitee._id;
        }, 30000); // Aumentar timeout para esta configuración

        it('should send an invitation successfully', async () => {
            const response = await request(app)
                .patch('/api/user/invite')
                .send({
                    email: inviteeEmail,
                    role: 'admin'
                })
                .set('Authorization', `Bearer ${inviterToken}`)
                .set('Accept', 'application/json');

            expect(response.status).toBe(200);

            // Verificar que la invitación se guardó
            const updatedInviter = await userModel.findById(inviterId);
            const updatedInvitee = await userModel.findById(inviteeId);

            expect(updatedInviter.sentInvitations.length).toBeGreaterThan(0);
            expect(updatedInvitee.invitations.length).toBeGreaterThan(0);
        });

        it('should handle inviting a non-existent user', async () => {
            const response = await request(app)
                .patch('/api/user/invite')
                .send({
                    email: 'nonexistent_user@example.com',
                    role: 'user'
                })
                .set('Authorization', `Bearer ${inviterToken}`)
                .set('Accept', 'application/json');

            expect(response.status).toBe(404);
            expect(response.body.error).toEqual('USER_NOT_EXISTS');
        });

        it('should accept an invitation successfully', async () => {
            const response = await request(app)
                .patch('/api/user/invite/accept')
                .send({
                    inviterId: inviterId.toString()
                })
                .set('Authorization', `Bearer ${inviteeToken}`)
                .set('Accept', 'application/json');

            expect(response.status).toBe(200);

            // Verificar que la invitación fue procesada correctamente
            const updatedInvitee = await userModel.findById(inviteeId);

            // La invitación debe haber sido eliminada o modificada
            const hasInvitation = updatedInvitee.invitations.some(
                inv => inv.userId.toString() === inviterId.toString() && inv.status === 'pending'
            );

            expect(hasInvitation).toBe(false);

            // El usuario debe tener al invitador como partner
            const isPartner = updatedInvitee.company &&
                updatedInvitee.company.partners &&
                updatedInvitee.company.partners.some(
                    partner => partner._id === inviterId.toString()
                );

            expect(isPartner).toBe(true);
        });

        it('should handle accepting a non-existent invitation', async () => {
            // Usar un ID de MongoDB válido pero que no corresponde a ninguna invitación
            const randomId = new mongoose.Types.ObjectId().toString();

            const response = await request(app)
                .patch('/api/user/invite/accept')
                .send({
                    inviterId: randomId
                })
                .set('Authorization', `Bearer ${inviteeToken}`)
                .set('Accept', 'application/json');

            expect(response.status).toBe(404);
            expect(response.body.error).toEqual('INVITATION_NOT_EXISTS');
        });

        it('should send and reject an invitation successfully', async () => {
            // Enviar una nueva invitación
            await request(app)
                .patch('/api/user/invite')
                .send({
                    email: inviteeEmail,
                    role: 'user'
                })
                .set('Authorization', `Bearer ${inviterToken}`)
                .set('Accept', 'application/json');

            // Rechazar la invitación
            const response = await request(app)
                .patch('/api/user/invite/reject')
                .send({
                    inviterId: inviterId.toString()
                })
                .set('Authorization', `Bearer ${inviteeToken}`)
                .set('Accept', 'application/json');

            expect(response.status).toBe(200);

            // Verificar que la invitación fue eliminada
            const updatedInvitee = await userModel.findById(inviteeId);
            const hasInvitation = updatedInvitee.invitations &&
                updatedInvitee.invitations.some(
                    inv => inv.userId.toString() === inviterId.toString()
                );

            expect(hasInvitation).toBe(false);
        });

        it('should handle rejecting a non-existent invitation', async () => {
            const randomId = new mongoose.Types.ObjectId().toString();

            const response = await request(app)
                .patch('/api/user/invite/reject')
                .send({
                    inviterId: randomId
                })
                .set('Authorization', `Bearer ${inviteeToken}`)
                .set('Accept', 'application/json');

            expect(response.status).toBe(404);
            expect(response.body.error).toEqual('INVITATION_NOT_FOUND');
        });
    });
});