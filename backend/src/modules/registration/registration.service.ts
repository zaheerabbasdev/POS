import { signAccessToken } from "../../common/utils/jwt.js";
import { getDisplayName } from "../../common/utils/userDisplay.js";
import { provisionShop } from "../../common/services/provisionShop.js";
import type { RegisterShopBody } from "./registration.validation.js";

/** POST /api/v1/registration/shop (spec §13-16). */
export async function registerShop(body: RegisterShopBody) {
  const result = await provisionShop(
    { shop: body.shop, owner: body.owner },
    {
      actorUserId: null,
      auditAction: "SHOP_REGISTERED",
      auditDescription: (shopName) => `Shop "${shopName}" registered via public sign-up.`,
    },
  );

  const token = signAccessToken({
    sub: result.user.id,
    username: result.user.username,
    employeeId: result.employee.id,
    shopId: result.shop.id,
    roleIds: [result.ownerRoleId],
  });

  return {
    token,
    user: {
      id: result.user.id,
      name: getDisplayName({ username: result.user.username, employee: result.employee }),
      role: "Owner",
      shopId: result.shop.id,
    },
    trial: {
      status: result.subscription.status,
      startDate: result.subscription.startDate,
      endDate: result.subscription.endDate,
    },
  };
}
