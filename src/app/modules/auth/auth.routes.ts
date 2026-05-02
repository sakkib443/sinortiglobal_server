import express from 'express';
import AuthController from './auth.controller';
import validateRequest from '../../middlewares/validateRequest';
import { registerValidation, loginValidation, refreshTokenValidation, forgotPasswordValidation, resetPasswordValidation, updatePasswordValidation } from './auth.validation';
import { authMiddleware } from '../../middlewares/auth';

const router = express.Router();

router.post('/register', validateRequest(registerValidation), AuthController.register);
router.post('/login', validateRequest(loginValidation), AuthController.login);
router.post('/refresh-token', validateRequest(refreshTokenValidation), AuthController.refreshToken);
router.post('/forgot-password', validateRequest(forgotPasswordValidation), AuthController.forgotPassword);
router.post('/reset-password', validateRequest(resetPasswordValidation), AuthController.resetPassword);
router.post('/update-password', authMiddleware, validateRequest(updatePasswordValidation), AuthController.updatePassword);
router.get('/me', authMiddleware, AuthController.getMe);
router.post('/logout', AuthController.logout);

export const AuthRoutes = router;
