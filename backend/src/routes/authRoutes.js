import express from 'express';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { email, fin, password, firstName, lastName, role } = req.body;

        const authRole = role || 'citizen';

        if (authRole === 'citizen') {
            if (!fin || !/^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z0-9]{7}$/.test(fin)) {
                return res.sendError(400, 'ERR_INVALID_FIN', 'FIN must be exactly 7 characters and contain both letters and numbers');
            }
            const userExists = await User.findOne({ fin });
            if (userExists) return res.sendError(400, 'ERR_USER_EXISTS', 'User with this FIN already exists');
        } else {
            if (!email) return res.sendError(400, 'ERR_INVALID_EMAIL', 'Email is required for admin');
            const userExists = await User.findOne({ email });
            if (userExists) return res.sendError(400, 'ERR_USER_EXISTS', 'User with this email already exists');
        }

        const user = await User.create({ email, fin, password, firstName, lastName, role: authRole });

        res.sendSuccess({
            _id: user._id,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            token: generateToken(user._id, user.role)
        });
    } catch (error) {
        res.sendError(500, 'ERR_REGISTER_FAIL', error.message);
    }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, fin, password } = req.body;

        // Find by FIN if provided, else fall back to email
        let user;
        if (fin) {
            user = await User.findOne({ fin });
        } else if (email) {
            user = await User.findOne({ email });
        }

        // Secure password comparison using bcrypt
        if (user && await user.matchPassword(password)) {
            res.sendSuccess({
                _id: user._id,
                role: user.role,
                firstName: user.firstName,
                lastName: user.lastName,
                token: generateToken(user._id, user.role)
            });
        } else {
            res.sendError(401, 'ERR_INVALID_CREDS', 'Invalid email or password');
        }
    } catch (error) {
        res.sendError(500, 'ERR_LOGIN_FAIL', error.message);
    }
});

// --- ADMIN USER MANAGEMENT ROUTES ---

// @route   GET /api/auth/users
// @desc    Get all users
// @access  Private/Admin
router.get('/users', protect, authorize('admin'), async (req, res) => {
    try {
        const users = await User.find({ role: 'admin' }).select('-password').sort({ createdAt: -1 });
        res.sendSuccess({ users });
    } catch (error) {
        res.sendError(500, 'ERR_FETCH_USERS', error.message);
    }
});

// @route   POST /api/auth/users
// @desc    Create a new admin user
// @access  Private/Admin
router.post('/users', protect, authorize('admin'), async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;

        if (!email || !password || !firstName || !lastName) {
            return res.sendError(400, 'ERR_MISSING_FIELDS', 'Please provide all required fields');
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.sendError(400, 'ERR_USER_EXISTS', 'User with this email already exists');
        }

        const user = await User.create({
            email,
            password,
            firstName,
            lastName,
            role: 'admin' // Force role to admin as requested
        });

        res.sendSuccess({ user: { _id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role } });
    } catch (error) {
        res.sendError(500, 'ERR_CREATE_USER', error.message);
    }
});

// @route   PUT /api/auth/users/:id
// @desc    Update user details
// @access  Private/Admin
router.put('/users/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.sendError(404, 'ERR_NOT_FOUND', 'User not found');
        }

        if (email) user.email = email;
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (password) user.password = password;

        const updatedUser = await user.save();
        res.sendSuccess({
            user: { _id: updatedUser._id, email: updatedUser.email, firstName: updatedUser.firstName, lastName: updatedUser.lastName, role: updatedUser.role }
        });
    } catch (error) {
        res.sendError(500, 'ERR_UPDATE_USER', error.message);
    }
});

// @route   DELETE /api/auth/users/:id
// @desc    Delete user
// @access  Private/Admin
router.delete('/users/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.sendError(404, 'ERR_NOT_FOUND', 'User not found');
        }

        // Prevent admin from deleting themselves
        if (user._id.toString() === req.user.id.toString()) {
            return res.sendError(403, 'ERR_FORBIDDEN', 'You cannot delete your own account');
        }

        await user.deleteOne();
        res.sendSuccess({ message: 'User removed' });
    } catch (error) {
        res.sendError(500, 'ERR_DELETE_USER', error.message);
    }
});

export default router;
