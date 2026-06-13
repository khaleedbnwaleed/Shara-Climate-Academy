import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI('AIzaSyAVDdzx6HBTSvy9DtKCHjq_9jRFz1x2ZUk');

async function listModels() {
  try {
    const models = await genAI.listModels();
    console.log('Available models:');
    models.forEach(model => {
      console.log(- );
    });
  } catch (error) {
    console.error('Error listing models:', error);
  }
}

listModels();
