import { generateToken } from "../../utils/generate-token.utils.js";
import * as userRepo from "./user.repo.js";
import { hash, genSalt, compare } from "bcrypt";
import { toLowerCaseAndRemoveSpaces } from "../../utils/handle-text-transformation.utils.js";
import { throwErrorWithMessage } from "../../utils/error.utils.js";

export const getCurrentUser = async (userId) =>
{
  const existingUser = await userRepo.findUserById(userId);

  if (!existingUser) {
    throwErrorWithMessage("Error fetching current user. Please try again.");
  }

  const { password, created_at, updated_at, ...user } = existingUser;

  return {
    data: user,
  };
};

export const updateCurrentUser = async (body, loggedInUser, res) =>
{
  const existingUser = await userRepo.findUserByEmail(loggedInUser?.email);

  if (!existingUser) {
    throwErrorWithMessage("User not found");
  }

  const { username, password, confirmPassword } = body;
  console.log("🚀 ~ updateCurrentUser ~ body:", body)

  if (!username || !password || !confirmPassword) {
    throwErrorWithMessage("Please fill all fields");
  }

  if (password !== confirmPassword) {
    throwErrorWithMessage("Password don't match, please try again.");
  }

  const { username: existingUsername } = existingUser;

  const isSameUsername = username === existingUsername;

  const newUsername = isSameUsername ? existingUsername : username;

  let newPassword;

  const isPasswordSame = await compare(password, existingUser?.password);

  if (!isPasswordSame) {
    const salt = await genSalt(10);
    newPassword = await hash(password, salt);
  }

  // Create user object to update in db
  const user = {
    id: existingUser.id,
    username: toLowerCaseAndRemoveSpaces(newUsername),
    password: isPasswordSame ? existingUser.password : newPassword,
  };

  // Generate Token
  const token = generateToken(user.id, res);
  const { password: userPassword, ...userWithOutPassword } = await userRepo.updateUserById(user);

  return { user: userWithOutPassword, token };
};

export const deleteCurrentUser = async (loggedInUser) =>
{
  const existingUser = await userRepo.findUserByEmail(loggedInUser?.email);
  
  if (!existingUser) {
    throwErrorWithMessage("User does not exist!");
  }

  const result = await userRepo.deleteUserInDB(existingUser?.id);
  
  if (!result) {
    throwErrorWithMessage("Error deleting user. Please try again.");
  }

  return { message: "User deleted successfully" };
};