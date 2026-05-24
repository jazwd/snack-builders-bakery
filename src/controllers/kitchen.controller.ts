import { scheduler } from '../services/app-state';

export async function getKitchenStatus(): Promise<
  ReturnType<typeof scheduler.getKitchenSnapshot>
> {
  return scheduler.getKitchenSnapshot();
}
