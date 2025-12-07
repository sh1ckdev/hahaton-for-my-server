import { getAllPrompts, upsertPrompt, deletePrompt, getPromptByKey } from "../services/promptService.js";

export const listPrompts = async (req, res) => {
  try {
    const prompts = await getAllPrompts();
    res.json(prompts);
  } catch (error) {
    console.error("Error listing prompts:", error);
    res.status(500).json({ error: "Failed to list prompts" });
  }
};

export const getPrompt = async (req, res) => {
  try {
    const { key } = req.params;
    const prompt = await getPromptByKey(key);
    
    if (!prompt) {
      return res.status(404).json({ error: "Prompt not found" });
    }
    
    res.json(prompt);
  } catch (error) {
    console.error("Error getting prompt:", error);
    res.status(500).json({ error: "Failed to get prompt" });
  }
};

export const createOrUpdatePrompt = async (req, res) => {
  try {
    const { key } = req.params;
    const { name, description, template, variables, isActive } = req.body;
    
    if (!template) {
      return res.status(400).json({ error: "Template is required" });
    }
    
    const prompt = await upsertPrompt(key, {
      name,
      description,
      template,
      variables,
      isActive
    });
    
    res.json(prompt);
  } catch (error) {
    console.error("Error creating/updating prompt:", error);
    res.status(500).json({ error: "Failed to create/update prompt" });
  }
};

export const removePrompt = async (req, res) => {
  try {
    const { key } = req.params;
    const deleted = await deletePrompt(key);
    
    if (!deleted) {
      return res.status(404).json({ error: "Prompt not found" });
    }
    
    res.json({ success: true, message: "Prompt deleted" });
  } catch (error) {
    console.error("Error deleting prompt:", error);
    res.status(500).json({ error: "Failed to delete prompt" });
  }
};

