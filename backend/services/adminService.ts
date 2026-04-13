// services/adminService.ts
// Unified cascade delete and admin-specific business logic.
import mongoose from "mongoose";
import { User } from "../models/User";
import { Room } from "../models/Room";
import { Channel } from "../models/Channel";
import { Message } from "../models/Message";
import { RefreshToken } from "../models/RefreshToken";
import { Notification } from "../models/Notification";
import { XpModel } from "../models/Xp";
import { SprintModel } from "../models/Sprint";
import { ScheduleModel } from "../models/Schedule";
import { GlobalMemoryModel } from "../models/GlobalMemory";
import { WeaknessModel } from "../models/Weakness";
import { AppNotificationModel } from "../models/AppNotification";
import { logger } from "../utils/logger";

/**
 * Cascade-delete ALL user data across every collection.
 * Used by both admin deleteUser and self-service deleteAccount.
 * Must be called within a transaction if the caller provides a session,
 * otherwise starts its own.
 */
export async function cascadeDeleteUser(userId: string, session?: mongoose.ClientSession): Promise<void> {
  const ownSession = !session;
  const s = session ?? await mongoose.startSession();

  try {
    const run = async () => {
      // 1. Transfer ownership of owned rooms or cascade-delete solo rooms
      const ownedRooms = await Room.find({ ownerId: userId }, { memberIds: 1 }, { session: s }).lean();

      // Separate into rooms with other members (transfer) vs solo rooms (delete)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mongoose bulkWrite requires any[]
      const transferOps: any[] = [];
      const soloRoomIds: string[] = [];

      for (const room of ownedRooms) {
        const others = (room.memberIds as string[]).filter((id) => id !== userId);
        if (others.length > 0) {
          const newOwner = others[0];
          transferOps.push({
            updateOne: {
              filter: { _id: room._id },
              update: {
                $set: { ownerId: newOwner, [`memberRoles.${newOwner}`]: ["role-owner"] },
                $pull: { memberIds: userId },
                $unset: { [`memberRoles.${userId}`]: "" },
                $inc: { memberCount: -1 },
              },
            },
          });
        } else {
          soloRoomIds.push(room._id.toString());
        }
      }

      // Batch transfer ownership (single bulkWrite instead of N updates)
      if (transferOps.length > 0) {
        await Room.bulkWrite(transferOps, { session: s });
      }

      // Batch delete solo rooms + their messages/channels
      if (soloRoomIds.length > 0) {
        await Promise.all([
          Message.deleteMany({ roomId: { $in: soloRoomIds } }, { session: s }),
          Channel.deleteMany({ roomId: { $in: soloRoomIds } }, { session: s }),
          Room.deleteMany({ _id: { $in: soloRoomIds } }, { session: s }),
        ]);
      }

      // 2. Leave rooms where member (not owner)
      await Room.updateMany(
        { memberIds: userId, ownerId: { $ne: userId } },
        { $pull: { memberIds: userId }, $unset: { [`memberRoles.${userId}`]: "" }, $inc: { memberCount: -1 } },
        { session: s }
      );

      // 3. Soft-delete messages
      await Message.updateMany(
        { authorId: userId },
        { $set: { deleted: true, content: "[deleted user]" } },
        { session: s }
      );

      // 4. Remove from friend lists
      await User.updateMany(
        { friendIds: userId },
        { $pull: { friendIds: userId, friendRequests: { from: userId } } },
        { session: s }
      );

      // 5. Delete refresh tokens
      await RefreshToken.deleteMany({ userId }, { session: s });

      // 6. Delete notifications (social)
      await Notification.deleteMany({ userId }, { session: s });

      // 7. Delete study-related orphan collections
      await XpModel.deleteMany({ userId }, { session: s });
      await SprintModel.deleteMany({ userId }, { session: s });
      await ScheduleModel.deleteMany({ userId }, { session: s });
      await GlobalMemoryModel.deleteMany({ userId }, { session: s });
      await WeaknessModel.deleteMany({ userId }, { session: s });
      await AppNotificationModel.deleteMany({ userId }, { session: s });

      // 8. Delete the user
      await User.findByIdAndDelete(userId, { session: s });
    };

    if (ownSession) {
      await s.withTransaction(run);
    } else {
      await run();
    }

    logger.info({ userId }, "Cascade delete completed");
  } finally {
    if (ownSession) {
      await s.endSession();
    }
  }
}
