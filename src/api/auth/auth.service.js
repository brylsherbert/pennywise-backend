import { generateToken } from "../../utils/generate-token.utils.js";
import { v7 as uuidv7 } from "uuid";
import * as userRepo from "../user/user.repo.js";
import { hash, genSalt, compare } from "bcrypt";
import { toLowerCaseAndRemoveSpaces } from "../../utils/handle-text-transformation.utils.js";
import { throwErrorWithMessage } from "../../utils/error.utils.js";

export const createUser = async (data, res) =>
{
    const existingUser = await userRepo.findUserByEmail(data.email);
    
    if (existingUser) {
        throwErrorWithMessage("Email already exists");
    }

    const { username, email, password: bodyPassword } = data;
    if (!username || !email || !bodyPassword) {
        throwErrorWithMessage("Please fill all fields");
    }

    const salt = await genSalt(10);
    const hashedPassword = await hash(bodyPassword, salt);

    const user = {
        id: uuidv7(),
        email: toLowerCaseAndRemoveSpaces(email),
        username: toLowerCaseAndRemoveSpaces(username),
        password: hashedPassword,
    };

    // Generate Token
    const token = generateToken(user?.id, res);
    const { password, ...userWithOutPassword } =
        await userRepo.insertUserToDB(user);

    return { user: userWithOutPassword, token };
};

export const loginUser = async (data, res) =>
{
    const existingUser = await userRepo.findUserByEmail(data.email);
   
    if (!existingUser) {
        throwErrorWithMessage("User does not exist. Please try again.");
    }

    const isPasswordValid = await compare(data.password, existingUser.password);
    
    if (!isPasswordValid) {
        throwErrorWithMessage("Invalid username or password");
    }

    // If password is valid return user and token
    const { password, ...existingUserWithOutPassword } = existingUser;

    // Generate Token
    const token = generateToken(existingUser.id, res);

    return { user: existingUserWithOutPassword, token };
};
