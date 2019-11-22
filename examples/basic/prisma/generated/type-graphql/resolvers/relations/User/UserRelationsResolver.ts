import { registerEnumType, ObjectType, Field, Int, Float, ID, Resolver, FieldResolver, Root, Ctx, InputType, Query, Mutation, Arg, ArgsType, Args } from "type-graphql";
import DataLoader from "dataloader";
import { Post } from "../../../models/Post";
import { User } from "../../../models/User";
import { UserPostsArgs } from "./args/UserPostsArgs";

function createGetUserPostsDataLoader(photon: any) {
  const argsToDataLoaderMap = new Map<string, DataLoader<string, Post[] | null>>();
  return function getUserPostsDataLoader(args: any) {
    const argsJSON = JSON.stringify(args);
    let userPostsDataLoader = argsToDataLoaderMap.get(argsJSON);
    if (!userPostsDataLoader) {
      userPostsDataLoader = new DataLoader<string, Post[] | null>(async keys => {
        const fetchedData: any[] = await photon.users.findMany({
          where: { id: { in: keys } },
          select: {
            id: true,
            posts: args,
          },
        });
        return keys
          .map(key => fetchedData.find(data => data.id === key)!)
          .map(data => data.posts);
      });
      argsToDataLoaderMap.set(argsJSON, userPostsDataLoader);
    }
    return userPostsDataLoader;
  }
}

@Resolver(_of => User)
export class UserRelationsResolver {
  @FieldResolver(_type => [Post], {
    nullable: true,
    description: undefined,
  })
  async posts(@Root() user: User, @Ctx() ctx: any, @Args() args: UserPostsArgs): Promise<Post[] | null> {
    ctx.getUserPostsDataLoader = ctx.getUserPostsDataLoader || createGetUserPostsDataLoader(ctx.photon);
    return ctx.getUserPostsDataLoader(args).load(user.id);
  }
}
