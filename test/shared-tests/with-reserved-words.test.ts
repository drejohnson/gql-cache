import gql from "graphql-tag";
import { OneTest } from "./one-test";

export const test: OneTest = {
  name: "with reserved keywords",
  query: gql`
    query TestQuery {
      posts {
        id
        __typename
        isProtoTypeOf {
          id
          __typename
          value
        }
        title
        hasOwnProperty {
          id
          __typename
          name
        }
      }
    }
  `,
  response: {
    data: {
      posts: [
        {
          id: "123",
          __typename: "Post",
          isProtoTypeOf: [
            {
              id: "1",
              __typename: "Value",
              value: 1
            },
            {
              id: "2",
              __typename: "Value",
              value: 2
            }
          ],
          title: "My awesome blog post",
          hasOwnProperty: {
            id: "1",
            __typename: "Commenter",
            name: "olle"
          }
        }
      ]
    }
  },
  entities: {
    ROOT_QUERY: {
      posts: ["Post;123"]
    },
    "Post;123": {
      id: "123",
      __typename: "Post",
      isProtoTypeOf: ["Value;1", "Value;2"],
      title: "My awesome blog post",
      hasOwnProperty: "Commenter;1"
    },
    "Value;1": { id: "1", __typename: "Value", value: 1 },
    "Value;2": { id: "2", __typename: "Value", value: 2 },
    "Commenter;1": { id: "1", __typename: "Commenter", name: "olle" }
  }
};
