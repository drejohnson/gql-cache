// tslint:disable:no-arguments
import * as GraphQL from "graphql";
import {
  DenormalizationResult,
  FieldNodeWithSelectionSet,
  GraphQLResponse,
  Variables,
  ResponseObject,
  ResponseObject2,
  ResponseObjectArray
} from "./types";
import {
  expandFragments,
  getDocumentDefinitions,
  fieldNameWithArguments,
  shouldIncludeField
} from "./functions";
import { EntityCache, StaleEntities, EntityId, Mutable } from "./entity-cache";

type MutableResponseObject = Mutable<ResponseObject>;
type MutableResponseObjectArray = Array<MutableResponseObject>;
type ParentResponseObjectOrArray =
  | Mutable<ResponseObject2>
  | ResponseObjectArray;
type ParentResponseKey = string | number | undefined;
type StackWorkItem = [
  FieldNodeWithSelectionSet,
  EntityId | ReadonlyArray<EntityId>,
  ParentResponseObjectOrArray,
  ParentResponseKey
];

export function denormalize(
  query: GraphQL.DocumentNode,
  variables: Variables | undefined,
  entities: EntityCache,
  staleEntities: StaleEntities = {}
): DenormalizationResult {
  const [fragmentMap, rootFieldNode] = getDocumentDefinitions(
    query.definitions
  );

  const stack: Array<StackWorkItem> = [];
  const response = {};
  let partial = false;
  let stale = false;
  stack.push([rootFieldNode, "ROOT_QUERY", response, undefined]);
  while (stack.length > 0) {
    const [
      fieldNode,
      idOrIdArray,
      parentObjectOrArray,
      parentResponseKey
    ] = stack.pop()!;

    const expandedSelections = expandFragments(
      fieldNode.selectionSet.selections,
      fragmentMap
    );

    // The stack has work items, depending on the work item we have four different cases to handle:
    // field + id      + parentObject = denormalize(ID) => [responseObject, workitems] and parentObject[field] = responseObject
    // field + id      + parentArray  = denormalize(ID) => [responseObject, workitems] and parentArray.push(responseObject)
    // field + idArray + parentObject = stack.push(workItemsFrom(idArray)) and parentObject[field] = new Array()
    // field + idArray + parentArray  = stack.push(workItemsFrom(idArray)) and parentArray.push(new Array())

    let responseObjectOrNewParentArray:
      | MutableResponseObject
      | MutableResponseObjectArray
      | null;

    if (idOrIdArray === null) {
      responseObjectOrNewParentArray = null;
    } else if (!Array.isArray(idOrIdArray)) {
      const id: EntityId = idOrIdArray as EntityId;

      const entity = entities[id];

      // Does not exist in cache. We can't fully resolve query
      if (entity === undefined) {
        partial = true;
        break;
      }

      const staleEntity = staleEntities[id];

      // If we've been here before we need to use the previously created response object
      if (Array.isArray(parentObjectOrArray)) {
        responseObjectOrNewParentArray =
          (parentObjectOrArray as MutableResponseObjectArray)[
            parentResponseKey as number
          ] || Object.create(null);
      } else {
        responseObjectOrNewParentArray =
          (parentObjectOrArray as MutableResponseObject)[
            parentResponseKey as string
          ] || Object.create(null);
      }

      for (const field of expandedSelections) {
        // Check if this field should be skipped according to @skip and @include directives
        const include = field.directives
          ? shouldIncludeField(field.directives, variables)
          : true;
        if (include) {
          // Build cacheKey according to any arguments
          const entityId =
            field.arguments && field.arguments.length > 0
              ? fieldNameWithArguments(field, variables)
              : field.name.value;
          // Check if this field is stale
          if (staleEntity) {
            const staleField = staleEntity[entityId];
            if (staleField !== undefined) {
              stale = true;
            }
          }
          const entityValue = entity[entityId];
          if (entityValue !== null && field.selectionSet) {
            // Put a work-item on the stack to build this field and set it on the response object
            stack.push([
              field as FieldNodeWithSelectionSet,
              entityValue as any,
              responseObjectOrNewParentArray as
                | MutableResponseObject
                | MutableResponseObjectArray,
              (field.alias && field.alias.value) || field.name.value
            ]);
          } else {
            // This field is a primitive (not a array or object)
            if (entityValue !== undefined) {
              (responseObjectOrNewParentArray as MutableResponseObject)[
                (field.alias && field.alias.value) || field.name.value
              ] = entityValue;
            } else {
              partial = true;
            }
          }
        }
      }
    } else {
      const idArray: ReadonlyArray<EntityId> = idOrIdArray;
      responseObjectOrNewParentArray =
        (parentObjectOrArray as MutableResponseObject)[
          parentResponseKey as string
        ] || [];
      for (let i = 0; i < idArray.length; i++) {
        const idArrayItem = idArray[i];
        stack.push([
          fieldNode,
          idArrayItem,
          responseObjectOrNewParentArray as
            | MutableResponseObject
            | MutableResponseObjectArray,
          i
        ]);
      }
    }

    // Add to the parent, either field or an array
    if (Array.isArray(parentObjectOrArray)) {
      const parentArray: MutableResponseObjectArray = parentObjectOrArray;
      parentArray[
        parentResponseKey as number
      ] = responseObjectOrNewParentArray as
        | MutableResponseObject
        | MutableResponseObjectArray;
    } else {
      const parentObject: MutableResponseObject = parentObjectOrArray;
      parentObject[
        parentResponseKey ||
          (fieldNode.alias && fieldNode.alias.value) ||
          fieldNode.name.value
      ] = responseObjectOrNewParentArray;
    }
  }

  return {
    partial,
    stale,
    response: !partial ? (response as GraphQLResponse) : undefined
  };
}
