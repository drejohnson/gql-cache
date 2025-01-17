import { OneTest } from "./one-test";
import gql from "graphql-tag";
import { standardResponse } from "./standard-response";
import { standardEntities } from "./standard-entities";

export const test: OneTest = {
  name: "simple",
  query: gql`
    query TestQuery {
      posts {
        id
        __typename
        author {
          id
          __typename
          name
        }
        title
        comments {
          id
          __typename
          commenter {
            id
            __typename
            name
          }
        }
      }
    }
  `,
  response: standardResponse,
  entities: standardEntities
};
