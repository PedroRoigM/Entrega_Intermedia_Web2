/**
* Obtener lista de la base de datos
* @param {*} req
* @param {*} res
*/
const { matchedData } = require('express-validator');
const { encrypt, compare } = require("../utils/handlePassword")
const { userModel } = require("../models")
const { tokenSign } = require("../utils/handleJwt")
const { handleHttpError } = require("../utils/handleError")
const uploadToPinata = require('../utils/UploadToPinata')
const pinata_gateway_url = process.env.PINATA_GATEWAY_URL

const getUser = async (req, res) => {
    res.json(req.user);
}
const registerUser = async (req, res) => {
    try {
        req = matchedData(req)

        const password = await encrypt(req.password)
        // Crear un codigo aleatorio para verificar el email
        const code = (Math.floor(Math.random() * (9999 - 1000) + 1000)).toString()
        // Crear un objeto con los datos del usuario
        const body = { ...req, password, code }
        // Verificar si el email ya existe
        const user = await userModel.findOne({ email: req.email })
        if (user) {
            if (user.validated) {
                handleHttpError(res, "EMAIL_ALREADY_EXISTS", 409)
                return
            }
            dataUser = await userModel.findOneAndUpdate({ email: req.email }, body, { new: true })

        } else {
            // Crear un nuevo usuario en la base de datos
            let dataUser = await userModel.create(body)
        }
        if (dataUser) {
            dataUser.set("password", undefined, { strict: false })
        }
        const data = {
            token: tokenSign(dataUser),
            user: dataUser
        }
        res.send(data)
    } catch (err) {
        console.log(err)
        handleHttpError(res, "ERROR_LOGIN_USER")
    }
};
const verifyEmail = async (req, res) => {
    try {
        const { email } = req.body

        const user = await userModel.findOne({ email })
        if (!user) {
            handleHttpError(res, "USER_NOT_EXISTS", 404)
            return
        }
        if (user.validated) {
            handleHttpError(res, "EMAIL_ALREADY_VALLIDATED", 400)
            return
        }
        // Verificar el email
        const { code } = req.body

        if (user.code !== code) {
            handleHttpError(res, "INVALID_CODE", 400)
        } else {
            user.validated = true
            user.code = undefined
            await user.save()
            res.send({ message: "EMAIL_VALIDATED" })
        }
    }
    catch (err) {
        handleHttpError(res, "ERROR_VALIDATING_EMAIL")
    }
}

const loginUser = async (req, res) => {
    try {
        req = matchedData(req)
        const user = await userModel.findOne({ email: req.email }).select("password name email validated")
        if (!user) {
            handleHttpError(res, "USER_NOT_EXISTS", 404)
            return
        }
        // Si no esta verificado el email
        console.log(user.validated)
        if (!user.validated) {
            handleHttpError(res, "EMAIL_NOT_VALIDATED", 401)
            return
        }
        const hashPassword = user.password
        const check = await compare(req.password, hashPassword)
        if (!check) {
            handleHttpError(res, "INVALID_PASSWORD", 401)
            return
        }
        user.set("password", undefined, { strict: false })
        const data = {
            token: await tokenSign(user),
            user
        }
        res.send(data)
    } catch (err) {
        handleHttpError(res, "ERROR_LOGIN_USER")
    }
}
const patchUser = async (req, res) => {
    try {
        const user = req.user
        const data = req.body
        const response = await userModel.findByIdAndUpdate(user._id, { $set: data }, { new: true })

        return res.send(response)
    }
    catch (err) {
        console.log(err)
        handleHttpError(res, "ERROR_PATCH_USER")
    }
};
const patchCompany = async (req, res) => {
    try {
        const user = req.user
        const data = req.body
        const response = await userModel.findByIdAndUpdate(user._id, { $set: { company: data } }, { new: true })

        return res.send(response)
    }
    catch (err) {
        console.log(err)
        handleHttpError(res, "ERROR_PATCH_COMPANY")
    }
};

const patchLogo = async (req, res) => {
    try {
        const user = req.user
        const fileName = req.file.originalname
        const fileBuffer = req.file.buffer
        const pinataResponse = await uploadToPinata(fileBuffer, fileName)
        const ipfsFile = pinataResponse.IpfsHash
        const ipfs_url = `https://${pinata_gateway_url}/ipfs/${ipfsFile}`
        const response = await userModel.findByIdAndUpdate(user._id, { $set: { logo: ipfs_url } }, { new: true })
        return res.send(response)
    } catch (err) {
        console.log(err)
        handleHttpError(res, "ERROR_PATCH_LOGO")
    }
};
const deleteUser = async (req, res) => {
    try {
        const user = req.user
        const { soft } = req.query
        if (soft === 'true') {
            await userModel.delete({ _id: user._id })
            res.send({ message: "USER_DELETED_SOFT" })
            return
        }
        await userModel.findByIdAndDelete({ _id: user._id })
        res.send({ message: "USER_DELETED" })
    } catch (err) {
        console.log(err)
        handleHttpError(res, "ERROR_DELETE_USER")
    }
};

const createRecoverPasswordCode = async (req, res) => {
    try {
        const { email } = req.body
        const user = await userModel
            .findOne({ email })
            .select("email name")
        if (!user) {
            handleHttpError(res, "USER_NOT_EXISTS", 404)
            return
        }
        const code = (Math.floor(Math.random() * (9999 - 1000) + 1000)).toString()
        user.code = code
        await user.save()
        res.send({ message: "CODE_CREATED" })
    }
    catch (err) {
        console.log(err)
        handleHttpError(res, "ERROR_CREATE_CODE")
    }
}
const recoverPassword = async (req, res) => {
    try {
        const { email, code, password } = req.body
        const user
            = await userModel.findOne
                ({ email })
        if (!user) {
            handleHttpError(res, "USER_NOT_EXISTS", 404)
            return
        }
        if (user.code !== code) {
            handleHttpError(res, "INVALID_CODE", 400)
            return
        }
        user.code = undefined
        user.password = await encrypt(password)
        await user.save()
        res.send({ message: "PASSWORD_UPDATED" })
    }
    catch (err) {
        console.log(err)
        handleHttpError(res, "ERROR_RECOVER_PASSWORD")
    }
}

const patchInviteUser = async (req, res) => {
    try {
        console.log(req.body)
        const user = req.user
        const invited = await userModel.find({ email: req.body.email })
        await userModel.findByIdAndUpdate(invited._id, { $push: { invitations: { _id: user._id, email: user.email, role: req.body.role } } }, { new: true })
        const response = await userModel.findByIdAndUpdate(user._id, { $push: { invited } }, { new: true })
        return res.send(response)
    }
    catch (err) {
        console.log(err)
        handleHttpError(res, "ERROR_PATCH_INVITE_USER")
    }
}

const patchAcceptInviteUser = async (req, res) => {
    try {
        const user = req.user
        const { inviterId } = req.body
        await userModel.findByIdAndUpdate(user._id, { $pull: { invited: { _id: inviterId } } }, { new: true })
        const response = await userModel.findByIdAndUpdate(inviterId, { $push: { acceptedInvitations: { _id: user._id, email: user.email, role: user.role } } }, { new: true })

        return res.send(response)
    }
    catch (err) {
        console.log(err)
        handleHttpError(res, "ERROR_PATCH_ACCEPT_INVITE_USER")
    }
}

const patchRejectInviteUser = async (req, res) => {
    try {
        const user = req.user
        const { inviterId } = req.body
        const response = await userModel.findByIdAndUpdate(user._id, { $pull: { invited: { _id: inviterId } } }, { new: true })
        return res.send(response)
    }
    catch (err) {
        console.log(err)
        handleHttpError(res, "ERROR_PATCH_REJECT_INVITE_USER")
    }
}

module.exports = {
    getUser,
    registerUser,
    loginUser,
    verifyEmail,
    patchUser,
    patchCompany,
    patchLogo,
    deleteUser,
    createRecoverPasswordCode,
    recoverPassword,
    patchInviteUser,
    patchAcceptInviteUser,
    patchRejectInviteUser
};