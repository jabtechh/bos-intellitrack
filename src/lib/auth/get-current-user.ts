import {
  classifyCurrentUser,
  type CurrentUserState,
} from "@/lib/auth/current-user-state";
import { getAuthUser } from "@/lib/auth/get-auth-user";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser(): Promise<CurrentUserState> {
  const authUser = await getAuthUser();

  if (!authUser) {
    return classifyCurrentUser(null, null);
  }

  const user = await prisma.user.findUnique({
    where: { authId: authUser.authId },
    select: {
      id: true,
      authId: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      profilePhotoPath: true,
      isActive: true,
    },
  });

  return classifyCurrentUser(authUser, user);
}
