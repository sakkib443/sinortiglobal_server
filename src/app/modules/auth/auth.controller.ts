import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import AuthService from './auth.service';
import config from '../../config';

const AuthController = {
    register: catchAsync(async (req: Request, res: Response) => {
        const result = await AuthService.register(req.body);
        sendResponse(res, { statusCode: 201, success: true, message: 'Registration successful', data: result });
    }),

    login: catchAsync(async (req: Request, res: Response) => {
        const result = await AuthService.login(req.body);

        // Set refresh token in cookie
        res.cookie('refreshToken', result.tokens.refreshToken, {
            httpOnly: true,
            secure: config.env === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        sendResponse(res, { statusCode: 200, success: true, message: 'Login successful', data: result });
    }),

    refreshToken: catchAsync(async (req: Request, res: Response) => {
        const { refreshToken } = req.body;
        const tokens = await AuthService.refreshToken(refreshToken);
        sendResponse(res, { statusCode: 200, success: true, message: 'Token refreshed', data: tokens });
    }),

    forgotPassword: catchAsync(async (req: Request, res: Response) => {
        const resetToken = await AuthService.forgotPassword(req.body.email);
        // TODO: send email with reset link
        const resetUrl = `${config.frontend_url}/reset-password?token=${resetToken}`;
        sendResponse(res, { statusCode: 200, success: true, message: 'Password reset link sent to email', data: { resetUrl } });
    }),

    resetPassword: catchAsync(async (req: Request, res: Response) => {
        const { token, newPassword } = req.body;
        await AuthService.resetPassword(token, newPassword);
        sendResponse(res, { statusCode: 200, success: true, message: 'Password reset successful' });
    }),

    updatePassword: catchAsync(async (req: Request, res: Response) => {
        const { currentPassword, newPassword } = req.body;
        await AuthService.updatePassword(req.user!.userId, currentPassword, newPassword);
        sendResponse(res, { statusCode: 200, success: true, message: 'Password updated successfully' });
    }),

    getMe: catchAsync(async (req: Request, res: Response) => {
        const user = await AuthService.getMe(req.user!.userId);
        sendResponse(res, { statusCode: 200, success: true, message: 'Profile fetched', data: user });
    }),

    logout: catchAsync(async (req: Request, res: Response) => {
        res.clearCookie('refreshToken');
        sendResponse(res, { statusCode: 200, success: true, message: 'Logged out successfully' });
    }),
};

export default AuthController;
