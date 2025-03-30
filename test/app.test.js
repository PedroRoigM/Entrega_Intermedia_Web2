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

    // Antes de todas las pruebas, limpiamos la base de datos
    beforeAll(async () => {
        // eliminar las pruebas de la base de datos
        await userModel.deleteMany({ email: { $in: [testUser.email, 'unverified@example.com', 'invited@example.com'] } });
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

        console.log('Token after registration:', response.body.token);
        console.log('User ID:', response.body.user._id);

        token = response.body.token;
        userId = response.body.user._id;
        verificationCode = response.body.user.code;
    });

    it('should verify user email', async () => {
        console.log('Verification code:', verificationCode);
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

        console.log('Token after login:', response.body.token);
        token = response.body.token; // Actualizamos el token con el nuevo
    });

    it('should get user profile', async () => {
        console.log('Token for profile:', token);

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

        console.log('Token for update:', token);
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

            console.log('Company data received:', company);

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
            console.log('Error updating company:', err);
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

        console.log('Token after password change:', response.body.token);
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

        console.log('Token for invite:', token);
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
        console.log('Token for delete:', token);
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
            console.log('Created test user:', registeredUser ? registeredUser.email : 'not found');

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
            console.log('Validated user:', {
                email: validatedUser.email,
                validated: validatedUser.validated,
                accountValidated: validatedUser.accountStatus?.validated
            });

            // Intentar iniciar sesión con la contraseña incorrecta
            const response = await request(app)
                .post('/api/user/login')
                .send({
                    email: testUserForInvalidLogin.email,
                    password: 'WrongPassword123'  // Contraseña incorrecta
                })
                .set('Accept', 'application/json');

            console.log('Login with wrong password response:', response.status, response.body);

            expect(response.status).toBe(401);
            expect(response.body.error).toEqual('INVALID_PASSWORD');
        } catch (error) {
            console.error('Test error:', error);
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
});