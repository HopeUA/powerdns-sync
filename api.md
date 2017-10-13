Task

    {
        type: string add|update|delete
        data: {
            record,
            zoneId
        }
    }

Zone

    {
        id:      PD.id
        records: Record[]
    }
    
Record

    {
        type:    string A|NS|...
        name:    string
        value:   string PD.content
        ttl:     PD.ttl
        comment: Comment
    }
    
Comment

    {
        content: string
        owner:   string
    }