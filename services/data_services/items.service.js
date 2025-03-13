const boom = require("@hapi/boom");
const { Op, QueryTypes } = require("sequelize");

const itemTypesIDS = {
    todo: 1,
    section: 2,
    folder: 3
}
const specialTypesIDS = {
    subTodo: 1,
    unsectioned: 2,
    inbox: 3
}

class ItemsService {
    constructor(ItemsRepository){
        this.itemsRepository = ItemsRepository
    }

    async getItemsTest() {
        try {
            const items = await this.itemsRepository.findAll({
                where: {

                    parent_id: null,
                    type_id: 3
                },
                order: [['order', 'ASC']],  // Ordena los elementos raíz
                logging: console.log,
                include: [
                    {
                        model: this.itemsRepository ,
                        as: 'subitems',
                        required: false,
                        where: {  type_id: 2 },
                        order: [['order', 'ASC']],  // 🔹 Ordenar subitems correctamente
                        separate: true, // 🔥 Permite que Sequelize aplique ORDER correctamente
                        include: [
                            {
                                model: this.itemsRepository ,
                                as: 'subitems',
                                required: false,
                                where: {  type_id: 1 },
                                order: [['order', 'ASC']],  // 🔹 Ordenar sub-subitems correctamente
                                separate: true,
                                include: [
                                    {
                                        model: this.itemsRepository ,
                                        as: 'subitems',
                                        required: false,
                                        where: {  type_id: 1, special_type_id: 1 },
                                        order: [['order', 'ASC']],  // 🔹 Ordenar sub-sub-subitems correctamente
                                        separate: true
                                    }
                                ]
                            }
                        ]
                    }
                ]
            });



          return (items);
        } catch (error) {
          throw (boom.internal('Internal error', error));
        }
}

    async getItems(userId) {
            try {
                const items = await this.itemsRepository .findAll({
                    where: {
                        user_id: userId,
                        parent_id: null,
                        type_id: 3
                    },
                    order: [['order', 'ASC']],  // Ordena los elementos raíz
                    logging: console.log,
                    include: [
                        {
                            model: this.itemsRepository ,
                            as: 'subitems',
                            required: false,
                            where: { user_id: userId, type_id: 2 },
                            order: [['order', 'ASC']],  // 🔹 Ordenar subitems correctamente
                            separate: true, // 🔥 Permite que Sequelize aplique ORDER correctamente
                            include: [
                                {
                                    model: this.itemsRepository ,
                                    as: 'subitems',
                                    required: false,
                                    where: { user_id: userId, type_id: 1 },
                                    order: [['order', 'ASC']],  // 🔹 Ordenar sub-subitems correctamente
                                    separate: true,
                                    include: [
                                        {
                                            model: this.itemsRepository ,
                                            as: 'subitems',
                                            required: false,
                                            where: { user_id: userId, type_id: 1, special_type_id: 1 },
                                            order: [['order', 'ASC']],  // 🔹 Ordenar sub-sub-subitems correctamente
                                            separate: true
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                });



              return (items);
            } catch (error) {
              throw (boom.internal('Internal error', error));
            }
    }

    async createTodo(body, userId) {

        const {parent_id} = body
        const TodoOrSectionParentOfTheTodo = await this.itemsRepository .findOne({
            where:{
                id: parent_id,
                user_id: userId,
                [Op.or]: [
                    {type_id: itemTypesIDS.todo},
                    {type_id: itemTypesIDS.section}
                ]
            }
        })

        if(!TodoOrSectionParentOfTheTodo){
            throw new Error(boom.badData('The defined item for this to-do does not exist'));
        }

        const actLastOrder = await this.getActualLastOrderForTodos(itemTypesIDS.todo, userId, parent_id)

        const newItem = await this.itemsRepository .create({
            ...body,
            user_id: userId,
            type_id: itemTypesIDS.todo,
            parent_id: TodoOrSectionParentOfTheTodo.dataValues.id,
            order: actLastOrder
        })

        delete newItem.dataValues.user_id

        return (newItem)
    }

    async createSection(body, userId) {
        const {parent_id} = body

        const folderOfTheSection = await this.itemsRepository .findOne({
            where:{
                id: parent_id,
                user_id: userId,
                type_id: itemTypesIDS.folder
            }
        })

        if(!folderOfTheSection){
            throw new Error(boom.badData('The defined folder for this section does not exist'));
        }

        const actLastOrder = await this.getActualLastOrder(itemTypesIDS.section, userId)

        const newItem = await this.itemsRepository .create({
            ...body,
            user_id: userId,
            type_id: itemTypesIDS.section,
            parent_id: folderOfTheSection.dataValues.id,
            order: actLastOrder
        })

        delete newItem.dataValues.user_id

        return (newItem)
    }

    async createFolder(body, userId) {
        const actLastOrder = await this.getActualLastOrder(itemTypesIDS.folder, userId)

        const newItem = await this.itemsRepository .create({
            ...body,
            user_id: userId,
            type_id: itemTypesIDS.folder,
            parent_id: null,
            order: actLastOrder
        })

        await this.createUnsectioned(newItem.dataValues.id, userId)

        delete newItem.dataValues.user_id

        return (newItem)
    }

    async createInbox(userID) {
        const inboxItem = await this.itemsRepository .create({
            item_name: 'INBOX',
            user_id: userID,
            type_id: itemTypesIDS.folder,
            parent_id: null,
            order: 0,
            special_type_id: specialTypesIDS.inbox
        })

        await this.createUnsectioned(inboxItem.dataValues.id, userID)
    }

    async createUnsectioned(folderID, userID) {
        const unsectioned = await this.itemsRepository .create({
            item_name: 'UNSECTIONED',
            user_id: userID,
            type_id: itemTypesIDS.section,
            parent_id: folderID,
            order: 0,
            special_type_id: specialTypesIDS.unsectioned
        })

        return (unsectioned)
    }

    async getActualLastOrder(typeItemId, userId){
        const lastItemType = await this.itemsRepository .findOne({
            where:{
                user_id: userId,
                type_id: typeItemId,
            },
            order: [['order', 'DESC']]
        })
        const actualLastOrder = lastItemType ? lastItemType.order + 1 : 0
        return (actualLastOrder)
    }

    async getActualLastOrderForTodos(typeItemId, userId, parentId){
        const lastItemType = await this.itemsRepository .findOne({
            where:{
                user_id: userId,
                type_id: typeItemId,
                parent_id: parentId
            },
            order: [['order', 'DESC']]
        })
        const actualLastOrder = lastItemType ? lastItemType.order + 1 : 0
        return (actualLastOrder)
    }

    async updateItem(id, newData, userId) {
        const itemEdited = this.itemsRepository .findOne({
            where: {
                id: id,
                user_id: userId,
            }
        })

        if(!itemEdited){
            throw new Error(boom.badData("The item does not exist"));

        }

        const newItem = this.itemsRepository .update(newData, {
            where: {
                id: id,
                user_id: userId
            }
        })

        return (newItem)

    }

    async updateStatusTodo(id, newData, userId) {
        const itemEdited = this.itemsRepository .findOne({
            where: {
                id: id,
                user_id: userId,
                type_id: itemTypesIDS.todo
            }
        })

        if(!itemEdited){
            throw new Error(boom.badData("The item does not exist"));

        }

        const newItem = this.itemsRepository .update(newData, {
            where: {
                id: id,
                user_id: userId
            }
        })

        return (newItem)

    }

    async deleteItem(itemId, userId) {
        const itemDeleted = this.itemsRepository .destroy({
            where: {
                id: itemId,
                user_id: userId
            }
        })

        return (itemDeleted)
    }




    async changeTodoToFolder (todoId, userId) {
        const newFolder = await this.itemsRepository .findByPk(todoId);
        if(!newFolder){
            throw new Error(boom.badData('This item does not exist'));
        }
        if(newFolder.dataValues.type_id != itemTypesIDS.todo){
            throw new Error(boom.badData('This item is not a to-do'));
        }
        const newOrder = await this.getActualLastOrder(itemTypesIDS.folder, userId)
        newFolder.type_id = itemTypesIDS.folder
        newFolder.order = newOrder
        newFolder.save()

        //create unsection para el nuevo folder
        const unsectioned = await this.createUnsectioned(newFolder.id, userId);

        //change subtodos to todos
        await this.itemsRepository .update({
            type_id: itemTypesIDS.todo,
            special_type_id: null,
            parent_id: unsectioned.dataValues.id
        },{
            where: {
                user_id: userId,
                parentId: todoId
            }
        })

        return(newFolder)
    }

    async changeSectionToFolder (sectionID, userId) {
        const newFolder = await this.itemsRepository .findByPk(sectionID);
        if(!newFolder){
            throw new Error(boom.badData('This item does not exist'));
        }
        if(newFolder.dataValues.type_id != itemTypesIDS.todo){
            throw new Error(boom.badData('This item is not a section'));
        }
        const newOrder = await this.getActualLastOrder(itemTypesIDS.folder, userId)
        newFolder.type_id = itemTypesIDS.folder
        newFolder.order = newOrder
        newFolder.save()

        //create unsection para el nuevo folder
        const unsectioned = await this.createUnsectioned(newFolder.id, userId);

        //change subtodos to todos
        await this.itemsRepository .update({
            parent_id: unsectioned.dataValues.id
        },{
            where: {
                user_id: userId,
                parentId: sectionID
            }
        })

        return(newFolder)
    }

    async changeOrderSameGroup (sourceOrder, targetOrder, parentId){
        if(sourceOrder == targetOrder){
            throw new Error(boom.badData('The order should not be equal'));
        }
        if(sourceOrder < targetOrder){
            const data = await this.upward(sourceOrder, targetOrder, parentId)
            return (data)
        }
        if(sourceOrder > targetOrder){
            const data = await this.downward(sourceOrder, targetOrder, parentId)
            return (data)
        }
    }

    async upward (source, target, parentId) {

        const data = await this.itemsRepository.query(`
            UPDATE items
            SET \`order\` = CASE
                WHEN \`order\` BETWEEN :source + 1 AND :target THEN \`order\` - 1
                WHEN \`order\` = :source THEN :target
                ELSE \`order\`
            END
            WHERE \`order\` BETWEEN :source AND :target
                AND parent_id = :parentId;
        `,{
        replacements:{
            source: source,
            target: target,
            parentId: parentId
        },
        type: QueryTypes.UPDATE
        })
    return(data)
    }

    async downward (source, target, parentId) {
        const data = await this.itemsRepository.query(`
                UPDATE items
                SET \`order\` = CASE
                    WHEN \`order\` BETWEEN :target AND :source - 1 THEN \`order\` + 1
                    WHEN \`order\` = :source THEN :target
                    ELSE \`order\`
                END
                WHERE \`order\` BETWEEN :target AND :source
                    AND parent_id = :parentId;
            `,{
            replacements:{
                source: source,
                target: target,
                parentId: parentId
            },
            type: QueryTypes.UPDATE
            })
        return(data)
    }
}



module.exports = ItemsService;
