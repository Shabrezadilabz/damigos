import { KitchenPausedMenu } from "@/components/kitchen-paused-menu";

import { MenuShop } from "@/components/menu-shop";

import { fetchGuestMenu, type GuestMenuItem } from "@/lib/api";



type MenuApiError = Error & {

  data?: { error?: { code?: string } };

  restaurant?: { id: string; name: string };

  items?: GuestMenuItem[];

};



/** G-S2 / P0-T11 + G-15 pause */

export default async function MenuPage({

  params,

}: {

  params: Promise<{ restaurantId: string }>;

}) {

  const { restaurantId } = await params;



  try {

    const menu = await fetchGuestMenu(restaurantId);

    return (
      <MenuShop restaurantId={restaurantId} restaurantName={menu.restaurant.name} items={menu.items} />
    );

  } catch (e) {

    const err = e as MenuApiError;

    const code = err.data?.error?.code;



    if (code === "ORDERING_PAUSED") {

      const name = err.restaurant?.name ?? "Kitchen";

      const items = err.items ?? [];

      return <KitchenPausedMenu restaurantId={restaurantId} restaurantName={name} items={items} />;

    }



    return (

      <main className="p-4 text-sm text-red-700">

        {err.message ?? "Menu unavailable"} — is guest-api running with DB migrated?

      </main>

    );

  }

}

