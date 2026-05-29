import { flag } from '@vercel/flags/next';
import { get } from '@vercel/edge-config';

export const aiModel = flag<string>({
  key: 'ai-model',
  // this is the magic part: it fetches the live value from your dashboard's edge config
  async decide() {
    const value = await get<string>('ai-model');
    return value ?? process.env.OPENROUTER_MODEL ?? 'openai/gpt-5.4-nano'; // fallback if the dashboard value is missing
  },
});
