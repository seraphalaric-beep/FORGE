import { FastifyInstance } from 'fastify';
import { guildConfig } from '@forge/shared';

interface SetGuildConfigBody {
  commitmentChannelId?: string;
  progressChannelId?: string;
  participantRoleId?: string;
}

interface GuildParams {
  guildId: string;
}

export async function guildRoutes(fastify: FastifyInstance) {
  // Get guild configuration
  fastify.get<{ Params: GuildParams }>('/:guildId', async (request, reply) => {
    const { guildId } = request.params;

    try {
      const config = await guildConfig.findByGuildId(guildId);
      if (!config) {
        return reply.code(404).send({ error: 'Guild configuration not found' });
      }
      return { config };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to get guild configuration' });
    }
  });

  // Update guild configuration
  fastify.put<{ Params: GuildParams; Body: SetGuildConfigBody }>(
    '/:guildId',
    async (request, reply) => {
      const { guildId } = request.params;
      const { commitmentChannelId, progressChannelId, participantRoleId } = request.body;

      try {
        const updateData: any = {};
        if (commitmentChannelId !== undefined) {
          updateData.commitmentChannelId = commitmentChannelId || null;
        }
        if (progressChannelId !== undefined) {
          updateData.progressChannelId = progressChannelId || null;
        }
        if (participantRoleId !== undefined) {
          updateData.participantRoleId = participantRoleId || null;
        }

        fastify.log.info({ guildId, updateData }, `Updating guild config for ${guildId}`);
        const config = await guildConfig.upsert(guildId, updateData);
        fastify.log.info({ config }, `Guild config updated successfully`);
        return { config };
      } catch (error: any) {
        fastify.log.error({ error, stack: error.stack }, 'Error updating guild configuration');
        fastify.log.error({
          message: error.message,
          code: error.code,
          name: error.name,
        }, 'Error details');
        return reply.code(500).send({ 
          error: 'Failed to update guild configuration',
          details: error.message 
        });
      }
    }
  );
}

