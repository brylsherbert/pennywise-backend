import express from "express";
import { validateBodyRequest } from "../../middlewares/validate-body-request.middleware.js";
import { authenticationMiddleware } from "../../middlewares/authentication.middleware.js";
import { createCategorySchema, updateCategorySchema } from "./categories.validator.js";
import { createCategoryController, deleteCategoryByIdController, getAllCategoriesController, getCategoryByIdController, updateCategoryByIdController } from "./categories.controller.js";

const router = express.Router();

router.use(authenticationMiddleware);
router.get("/", getAllCategoriesController); 
router.get("/:id", getCategoryByIdController); 
router.post("/create", validateBodyRequest(createCategorySchema), createCategoryController);
router.patch("/:id/update", validateBodyRequest(updateCategorySchema), updateCategoryByIdController);
router.delete("/:id/delete", deleteCategoryByIdController);

export default router;